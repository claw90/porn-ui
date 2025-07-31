import { spawn } from 'child_process';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs';
import { generatePDFReport } from './pdfGenerator';

interface ProcessingOptions {
  tolerance: number;
  frameSkip: number;
  includeThumbnails: boolean;
}

export async function processVideoAnalysis(
  analysisId: string,
  videoPath: string,
  targetFacePath: string,
  options: ProcessingOptions
): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Update status to processing
    await storage.updateAnalysis(analysisId, { 
      status: 'processing' 
    });

    // Create output directory for this analysis
    const outputDir = path.join('outputs', analysisId);
    fs.mkdirSync(outputDir, { recursive: true });

    // Run the Python face recognition script
    const matches = await runFaceRecognitionScript(
      videoPath,
      targetFacePath,
      outputDir,
      options
    );

    const processingTime = Math.round((Date.now() - startTime) / 1000);

    // Update analysis with results
    await storage.updateAnalysis(analysisId, {
      status: 'completed',
      processingTime,
      matchCount: matches.length,
      matches,
      completedAt: new Date(),
    });

    // Generate PDF report
    const analysis = await storage.getAnalysis(analysisId);
    if (analysis) {
      const reportPath = await generatePDFReport(analysis);
      await storage.updateAnalysis(analysisId, { reportPath });
    }

  } catch (error) {
    console.error('Face recognition processing failed:', error);
    await storage.updateAnalysis(analysisId, {
      status: 'error',
      processingTime: Math.round((Date.now() - startTime) / 1000),
    });
  }
}

function runFaceRecognitionScript(
  videoPath: string,
  targetFacePath: string,
  outputDir: string,
  options: ProcessingOptions
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'face_recognition_scripts', 'video_face_scan.py');
    
    const args = [
      scriptPath,
      '--video', videoPath,
      '--target', targetFacePath,
      '--output', outputDir,
      '--tolerance', options.tolerance.toString(),
      '--frame-skip', options.frameSkip.toString(),
    ];

    if (options.includeThumbnails) {
      args.push('--save-thumbnails');
    }

    const pythonProcess = spawn('python3', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse the JSON output from the Python script
          const results = JSON.parse(stdout.trim());
          resolve(results.matches || []);
        } catch (parseError) {
          console.error('Failed to parse Python script output:', parseError);
          reject(new Error('Failed to parse face recognition results'));
        }
      } else {
        console.error('Python script failed:', stderr);
        reject(new Error(`Face recognition script failed with code ${code}: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python script:', error);
      reject(error);
    });
  });
}

export async function processVideoOnlyAnalysis(
  analysisId: string,
  videoPath: string,
  options: Omit<ProcessingOptions, 'tolerance'>
): Promise<void> {
  const startTime = Date.now();

  try {
    // Update status to processing
    await storage.updateAnalysis(analysisId, {
      status: 'processing'
    });

    // Create output directory for this analysis
    const outputDir = path.join('outputs', analysisId);
    fs.mkdirSync(outputDir, { recursive: true });

    // Run the Python face detection script (without target face matching)
    const faces = await runFaceDetectionScript(videoPath, outputDir, options);

    const processingTime = Math.round((Date.now() - startTime) / 1000);

    // Update analysis with results
    await storage.updateAnalysis(analysisId, {
      status: 'completed',
      processingTime,
      matchCount: faces.length,
      matches: faces,
      completedAt: new Date(),
    });

    // Generate PDF report
    const analysis = await storage.getAnalysis(analysisId);
    if (analysis) {
      const reportPath = await generatePDFReport(analysis);
      await storage.updateAnalysis(analysisId, { reportPath });
    }

  } catch (error) {
    console.error('Video-only processing failed:', error);
    await storage.updateAnalysis(analysisId, {
      status: 'error',
      processingTime: Math.round((Date.now() - startTime) / 1000),
    });
  }
}

export async function processFaceOnlyAnalysis(
  analysisId: string,
  facePath: string
): Promise<void> {
  const startTime = Date.now();

  try {
    // Update status to processing
    await storage.updateAnalysis(analysisId, {
      status: 'processing'
    });

    // Create output directory for this analysis
    const outputDir = path.join('outputs', analysisId);
    fs.mkdirSync(outputDir, { recursive: true });

    // Run the Python face analysis script
    const analysis = await runFaceAnalysisScript(facePath, outputDir);

    const processingTime = Math.round((Date.now() - startTime) / 1000);

    // Update analysis with results
    await storage.updateAnalysis(analysisId, {
      status: 'completed',
      processingTime,
      matchCount: 1, // Single face analysis
      matches: [analysis],
      completedAt: new Date(),
    });

    // Generate PDF report
    const analysisRecord = await storage.getAnalysis(analysisId);
    if (analysisRecord) {
      const reportPath = await generatePDFReport(analysisRecord);
      await storage.updateAnalysis(analysisId, { reportPath });
    }

  } catch (error) {
    console.error('Face-only processing failed:', error);
    await storage.updateAnalysis(analysisId, {
      status: 'error',
      processingTime: Math.round((Date.now() - startTime) / 1000),
    });
  }
}

function runFaceDetectionScript(
  videoPath: string,
  outputDir: string,
  options: Omit<ProcessingOptions, 'tolerance'>
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'face_recognition_scripts', 'face_check.py');

    const args = [
      scriptPath,
      '--video', videoPath,
      '--output', outputDir,
      '--frame-skip', options.frameSkip.toString(),
    ];

    if (options.includeThumbnails) {
      args.push('--save-thumbnails');
    }

    const pythonProcess = spawn('python3', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const results = JSON.parse(stdout.trim());
          resolve(results.faces || []);
        } catch (parseError) {
          console.error('Failed to parse Python script output:', parseError);
          reject(new Error('Failed to parse face detection results'));
        }
      } else {
        console.error('Python script failed:', stderr);
        reject(new Error(`Face detection script failed with code ${code}: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python script:', error);
      reject(error);
    });
  });
}

function runFaceAnalysisScript(
  facePath: string,
  outputDir: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'face_recognition_scripts', 'face_check.py');

    const args = [
      scriptPath,
      '--image', facePath,
      '--output', outputDir,
    ];

    const pythonProcess = spawn('python3', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const results = JSON.parse(stdout.trim());
          resolve(results.analysis || {});
        } catch (parseError) {
          console.error('Failed to parse Python script output:', parseError);
          reject(new Error('Failed to parse face analysis results'));
        }
      } else {
        console.error('Python script failed:', stderr);
        reject(new Error(`Face analysis script failed with code ${code}: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python script:', error);
      reject(error);
    });
  });
}
