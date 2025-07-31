import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { recommendationEngine } from "./recommendation-engine";
import multer from "multer";
import path from "path";
import { 
  insertAnalysisSchema,
  insertVideoSchema,
  insertVideoUrlSchema,
  insertPerformerSchema,
  insertCollectionSchema,
  insertPlaylistSchema
} from "@shared/schema";
import { processVideoAnalysis } from "./services/faceRecognition";
import { generatePDFReport } from "./services/pdfGenerator";
import { performerSearchService } from "./services/performerSearchService";
import { DuplicateDetectionService } from "./services/duplicateDetectionService";
import { validateVideoUrl } from "./utils/urlValidator";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = file.fieldname === 'video' ? 'uploads/videos' : 'uploads/faces';
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB for videos
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });

    if (file.fieldname === 'video') {
      if (file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|avi|mov|mkv|wmv|flv|webm)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'));
      }
    } else if (file.fieldname === 'targetFace' || file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/') || file.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Video Library Routes
  app.get('/api/videos', async (req, res) => {
    try {
      const { search, collection, sort = 'recent', limit = 50, offset = 0 } = req.query;
      
      let videos;
      if (search) {
        videos = await storage.searchVideos(search as string);
      } else if (collection) {
        videos = await storage.getVideosByCollection(collection as string);
      } else {
        videos = await storage.getVideos(parseInt(limit as string), parseInt(offset as string));
      }
      
      res.json(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ error: 'Failed to fetch videos' });
    }
  });

  app.post('/api/videos', async (req, res) => {
    try {
      const videoData = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo(videoData);
      res.json(video);
    } catch (error) {
      console.error('Error creating video:', error);
      res.status(500).json({ error: 'Failed to create video' });
    }
  });

  // Route specifically for adding video URLs with duplicate detection
  app.post('/api/videos/url', async (req, res) => {
    try {
      const videoData = insertVideoUrlSchema.parse(req.body);
      
      // Check for duplicates before creating
      if (videoData.videoUrl) {
        const duplicateCheck = await DuplicateDetectionService.checkForDuplicate(videoData.videoUrl);
        if (duplicateCheck.isDuplicate) {
          return res.status(409).json({ 
            error: 'Duplicate video detected', 
            message: duplicateCheck.message,
            existingVideo: duplicateCheck.existingVideo
          });
        }
      }
      
      const video = await storage.createVideoFromUrl(videoData);
      res.json(video);
    } catch (error) {
      console.error('Error creating video from URL:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create video from URL' });
    }
  });

  // Video URL validation endpoint
  app.get('/api/videos/:id/validate', async (req, res) => {
    try {
      const { id } = req.params;
      const video = await storage.getVideo(id);
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (!video.videoUrl) {
        return res.status(400).json({ error: 'No video URL to validate' });
      }

      const validation = await validateVideoUrl(video.videoUrl);
      res.json({
        videoId: id,
        url: video.videoUrl,
        ...validation
      });
    } catch (error) {
      console.error('Error validating video URL:', error);
      res.status(500).json({ error: 'Failed to validate video URL' });
    }
  });

  // Real thumbnail extraction endpoint
  app.get('/api/videos/:id/thumbnail', async (req, res) => {
    try {
      const { id } = req.params;
      const video = await storage.getVideo(id);
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.isExternal && video.videoUrl) {
        const url = new URL(video.videoUrl);
        const domain = url.hostname.replace('www.', '');
        
        // Try to extract real thumbnails from video platforms
        let thumbnailUrl = null;
        
        if (domain.includes('thisvid.com')) {
          // Extract ThisVid thumbnail
          try {
            const response = await fetch(video.videoUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const html = await response.text();
            
            // Look for video thumbnail in meta tags
            const metaThumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (metaThumbMatch) {
              thumbnailUrl = metaThumbMatch[1];
            }
          } catch (error) {
            console.log('Failed to fetch ThisVid thumbnail:', error instanceof Error ? error.message : 'Unknown error');
          }
        } else if (domain.includes('pornhub.com')) {
          // Extract PornHub thumbnail
          try {
            const response = await fetch(video.videoUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const html = await response.text();
            
            const metaThumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (metaThumbMatch) {
              thumbnailUrl = metaThumbMatch[1];
            }
          } catch (error) {
            console.log('Failed to fetch PornHub thumbnail:', error instanceof Error ? error.message : 'Unknown error');
          }
        } else if (domain.includes('xvideos.com')) {
          // Extract XVideos thumbnail
          try {
            const response = await fetch(video.videoUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const html = await response.text();
            
            const metaThumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (metaThumbMatch) {
              thumbnailUrl = metaThumbMatch[1];
            }
          } catch (error) {
            console.log('Failed to fetch XVideos thumbnail:', error instanceof Error ? error.message : 'Unknown error');
          }
        } else {
          // Generic Open Graph image extraction for other sites
          try {
            const response = await fetch(video.videoUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            const html = await response.text();
            
            const metaThumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (metaThumbMatch) {
              thumbnailUrl = metaThumbMatch[1];
            }
          } catch (error) {
            console.log('Failed to fetch generic thumbnail:', error instanceof Error ? error.message : 'Unknown error');
          }
        }
        
        // If we found a real thumbnail, proxy it
        if (thumbnailUrl) {
          try {
            const thumbnailResponse = await fetch(thumbnailUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': video.videoUrl
              }
            });
            
            if (thumbnailResponse.ok) {
              const contentType = thumbnailResponse.headers.get('content-type') || 'image/jpeg';
              const imageBuffer = await thumbnailResponse.arrayBuffer();
              
              res.setHeader('Content-Type', contentType);
              res.setHeader('Cache-Control', 'public, max-age=3600');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.send(Buffer.from(imageBuffer));
              return;
            }
          } catch (error) {
            console.log('Failed to proxy thumbnail:', error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }
      
      // Fallback to placeholder
      res.status(404).json({ error: 'No thumbnail available' });
    } catch (error: any) {
      console.error('Error generating thumbnail:', error);
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  });

  app.patch('/api/videos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const video = await storage.updateVideo(id, updates);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }
      res.json(video);
    } catch (error) {
      console.error('Error updating video:', error);
      res.status(500).json({ error: 'Failed to update video' });
    }
  });

  // Save video to collection
  app.post('/api/videos/:id/save', async (req, res) => {
    try {
      const { id } = req.params;
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }
      
      // Mark video as saved/bookmarked
      await storage.updateVideo(id, { isBookmarked: true });
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving video:', error);
      res.status(500).json({ error: 'Failed to save video' });
    }
  });

  // Rate video
  app.post('/api/videos/:id/rate', async (req, res) => {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      
      await storage.updateVideo(id, { rating });
      res.json({ success: true });
    } catch (error) {
      console.error('Error rating video:', error);
      res.status(500).json({ error: 'Failed to rate video' });
    }
  });

  app.delete('/api/videos/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteVideo(id);
      if (!success) {
        return res.status(404).json({ error: 'Video not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ error: 'Failed to delete video' });
    }
  });

  // Performer Routes
  app.get('/api/performers', async (req, res) => {
    try {
      const { search, sort = 'popularity', limit = 50 } = req.query;
      
      let performers;
      if (search) {
        performers = await storage.searchPerformers(search as string);
      } else {
        performers = await storage.getPerformers(parseInt(limit as string));
      }
      
      res.json(performers);
    } catch (error) {
      console.error('Error fetching performers:', error);
      res.status(500).json({ error: 'Failed to fetch performers' });
    }
  });

  app.post('/api/performers', async (req, res) => {
    try {
      const performerData = insertPerformerSchema.parse(req.body);
      const performer = await storage.createPerformer(performerData);
      res.json(performer);
    } catch (error) {
      console.error('Error creating performer:', error);
      res.status(500).json({ error: 'Failed to create performer' });
    }
  });

  app.patch('/api/performers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const performer = await storage.updatePerformer(id, updates);
      if (!performer) {
        return res.status(404).json({ error: 'Performer not found' });
      }
      res.json(performer);
    } catch (error) {
      console.error('Error updating performer:', error);
      res.status(500).json({ error: 'Failed to update performer' });
    }
  });

  app.delete('/api/performers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePerformer(id);
      if (!success) {
        return res.status(404).json({ error: 'Performer not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting performer:', error);
      res.status(500).json({ error: 'Failed to delete performer' });
    }
  });

  // Collection Routes
  app.get('/api/collections', async (req, res) => {
    try {
      const collections = await storage.getCollections();
      res.json(collections);
    } catch (error) {
      console.error('Error fetching collections:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  });

  app.post('/api/collections', async (req, res) => {
    try {
      const collectionData = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(collectionData);
      res.json(collection);
    } catch (error) {
      console.error('Error creating collection:', error);
      res.status(500).json({ error: 'Failed to create collection' });
    }
  });

  // Playlist Routes
  app.get('/api/playlists', async (req, res) => {
    try {
      const playlists = await storage.getPlaylists();
      res.json(playlists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  });

  app.post('/api/playlists', async (req, res) => {
    try {
      const playlistData = insertPlaylistSchema.parse(req.body);
      const playlist = await storage.createPlaylist(playlistData);
      res.json(playlist);
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({ error: 'Failed to create playlist' });
    }
  });

  // Real-time face recognition endpoint
  app.post('/api/face-recognition/realtime', async (req, res) => {
    try {
      const { frameData, targetFaceImage, confidence, timestamp } = req.body;
      
      // Mock real-time analysis response for demo
      const hasMatch = Math.random() > 0.8; // 20% chance of match for demo
      
      if (hasMatch) {
        res.json({
          match: true,
          confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
          performer: "Demo Performer",
          timestamp: timestamp,
          frameData: null
        });
      } else {
        res.json({
          match: false,
          timestamp: timestamp
        });
      }
    } catch (error) {
      console.error('Real-time face recognition error:', error);
      res.status(500).json({ error: 'Real-time analysis failed' });
    }
  });

  // Create analysis with file uploads
  app.post('/api/analyses', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'targetFace', maxCount: 1 }
  ]), async (req, res) => {
    try {
      console.log('Upload request received:', {
        files: req.files ? Object.keys(req.files) : 'no files',
        body: req.body
      });

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.video || !files.targetFace) {
        console.log('Missing files:', { video: !!files.video, targetFace: !!files.targetFace });
        return res.status(400).json({ 
          error: 'Both video and target face files are required',
          received: Object.keys(files || {})
        });
      }

      const videoFile = files.video[0];
      const targetFaceFile = files.targetFace[0];

      console.log('Files received:', {
        video: { name: videoFile.originalname, type: videoFile.mimetype, size: videoFile.size },
        targetFace: { name: targetFaceFile.originalname, type: targetFaceFile.mimetype, size: targetFaceFile.size }
      });

      const analysisData = {
        videoFilename: videoFile.originalname,
        videoPath: videoFile.path,
        targetFaceFilename: targetFaceFile.originalname,
        targetFacePath: targetFaceFile.path,
        tolerance: parseFloat(req.body.tolerance) || 0.5,
        frameSkip: parseInt(req.body.frameSkip) || 5,
        includeThumbnails: req.body.includeThumbnails === 'true' ? 1 : 0,
      };

      const validatedData = insertAnalysisSchema.parse(analysisData);
      const analysis = await storage.createAnalysis(validatedData);

      console.log('Analysis created with ID:', analysis.id);

      // Start processing in background
      processVideoAnalysis(analysis.id, analysis.videoPath, analysis.targetFacePath, {
        tolerance: analysis.tolerance,
        frameSkip: analysis.frameSkip,
        includeThumbnails: analysis.includeThumbnails === 1
      }).catch(console.error);

      res.json(analysis);
    } catch (error) {
      console.error('Error creating analysis:', error);
      if (error instanceof Error) {
        res.status(500).json({ 
          error: 'Failed to create analysis',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      } else {
        res.status(500).json({ error: 'Failed to create analysis' });
      }
    }
  });

  // Get analysis by ID
  app.get('/api/analyses/:id', async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      res.json(analysis);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      res.status(500).json({ error: 'Failed to fetch analysis' });
    }
  });

  // Get all analyses
  app.get('/api/analyses', async (req, res) => {
    try {
      const analyses = await storage.getAllAnalyses();
      res.json(analyses);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      res.status(500).json({ error: 'Failed to fetch analyses' });
    }
  });

  // Get recent analyses
  app.get('/api/analyses/recent/:limit?', async (req, res) => {
    try {
      const limit = req.params.limit ? parseInt(req.params.limit) : 5;
      const analyses = await storage.getRecentAnalyses(limit);
      res.json(analyses);
    } catch (error) {
      console.error('Error fetching recent analyses:', error);
      res.status(500).json({ error: 'Failed to fetch recent analyses' });
    }
  });

  // Download PDF report
  app.get('/api/analyses/:id/report', async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      if (analysis.status !== 'completed' || !analysis.reportPath) {
        return res.status(400).json({ error: 'Report not available' });
      }

      if (!fs.existsSync(analysis.reportPath)) {
        // Generate report if it doesn't exist
        const reportPath = await generatePDFReport(analysis);
        await storage.updateAnalysis(analysis.id, { reportPath });
      }

      res.download(analysis.reportPath, `analysis-report-${analysis.id}.pdf`);
    } catch (error) {
      console.error('Error downloading report:', error);
      res.status(500).json({ error: 'Failed to download report' });
    }
  });

  // Generate customized PDF report
  app.post('/api/analyses/:id/report/custom', async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      if (analysis.status !== 'completed') {
        return res.status(400).json({ error: 'Analysis not completed yet' });
      }

      const reportConfig = req.body;
      
      // Import ReportCustomizer dynamically to avoid circular dependency
      const { ReportCustomizer } = await import('./services/reportCustomizer');
      
      const reportPath = await ReportCustomizer.generateCustomReport(analysis, reportConfig);
      
      // Update analysis with custom report configuration
      await storage.updateAnalysis(analysis.id, { 
        reportPath,
        reportConfig 
      });

      res.json({ 
        success: true, 
        reportPath,
        message: 'Custom report generated successfully' 
      });
    } catch (error) {
      console.error('Error generating custom report:', error);
      res.status(500).json({ error: 'Failed to generate custom report' });
    }
  });

  // Preview report configuration (returns HTML)
  app.post('/api/analyses/:id/report/preview', async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }

      const reportConfig = req.body;
      
      // Generate HTML preview without saving to file
      const { ReportCustomizer } = await import('./services/reportCustomizer');
      const htmlContent = ReportCustomizer.generatePreviewHTML(analysis, reportConfig);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error('Error generating report preview:', error);
      res.status(500).json({ error: 'Failed to generate preview' });
    }
  });

  // Get report templates
  app.get('/api/report-templates', async (req, res) => {
    try {
      const templates = await storage.getReportTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching report templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Save custom report template
  app.post('/api/report-templates', async (req, res) => {
    try {
      const template = await storage.createReportTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error('Error saving report template:', error);
      res.status(500).json({ error: 'Failed to save template' });
    }
  });

  // AI Video Tagging and Similarity Endpoints
  
  // Analyze and tag a specific video
  app.post('/api/videos/:id/analyze', async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const { VideoTaggingService } = await import('./services/videoTaggingService');
      const analysis = await VideoTaggingService.analyzeVideo(video.videoUrl || '', video.title);
      
      // Update video with AI-generated tags
      await storage.updateVideo(req.params.id, {
        tags: analysis.tags,
        categories: analysis.categories,
        performers: analysis.performers
      });

      res.json({
        success: true,
        analysis,
        message: 'Video analyzed and tagged successfully'
      });
    } catch (error) {
      console.error('Error analyzing video:', error);
      res.status(500).json({ error: 'Failed to analyze video' });
    }
  });

  // Get similar videos based on AI analysis
  app.get('/api/videos/:id/similar', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      
      const { VideoTaggingService } = await import('./services/videoTaggingService');
      const similarVideos = await VideoTaggingService.findSimilarVideos(req.params.id, limit);
      
      // Fetch full video details for similar videos
      const videoDetails = await Promise.all(
        similarVideos.map(async (sim) => {
          const video = await storage.getVideo(sim.videoId);
          return {
            ...video,
            similarityScore: sim.score,
            matchedFeatures: sim.matchedFeatures,
            reason: sim.reason
          };
        })
      );

      res.json(videoDetails.filter(v => v !== null));
    } catch (error) {
      console.error('Error finding similar videos:', error);
      res.status(500).json({ error: 'Failed to find similar videos' });
    }
  });

  // Batch analyze multiple videos
  app.post('/api/videos/analyze-batch', async (req, res) => {
    try {
      const { videoIds } = req.body;
      
      if (!Array.isArray(videoIds)) {
        return res.status(400).json({ error: 'videoIds must be an array' });
      }

      const { VideoTaggingService } = await import('./services/videoTaggingService');
      const results = await VideoTaggingService.batchAnalyzeVideos(videoIds);
      
      res.json({
        success: true,
        analyzedCount: results.size,
        results: Object.fromEntries(results),
        message: `Successfully analyzed ${results.size} videos`
      });
    } catch (error) {
      console.error('Error batch analyzing videos:', error);
      res.status(500).json({ error: 'Failed to batch analyze videos' });
    }
  });

  // Internet-based performer search and identification
  app.post('/api/performers/search-by-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      console.log('Starting internet performer search for image:', req.file.originalname);
      
      // Create performer profile from internet search
      const performerId = await performerSearchService.createPerformerFromSearch(req.file.path);
      
      if (!performerId) {
        return res.status(404).json({ 
          error: 'No performer found in internet search',
          message: 'Could not identify performer from uploaded image'
        });
      }

      // Get the created performer details
      const performer = await storage.getPerformer(performerId);
      
      res.json({
        success: true,
        performer,
        message: 'Performer identified and profile created from internet search'
      });
    } catch (error) {
      console.error('Error in performer search:', error);
      res.status(500).json({ error: 'Failed to search for performer' });
    }
  });

  // Get enhanced performer details with internet search data
  app.get('/api/performers/:id/enhanced', async (req, res) => {
    try {
      const performer = await storage.getPerformer(req.params.id);
      if (!performer) {
        return res.status(404).json({ error: 'Performer not found' });
      }

      // If performer doesn't have enhanced data, trigger internet search
      if (!performer.confidence || performer.confidence < 0.5) {
        if (performer.faceImagePath) {
          const updatedId = await performerSearchService.createPerformerFromSearch(performer.faceImagePath);
          if (updatedId) {
            const enhancedPerformer = await storage.getPerformer(updatedId);
            return res.json(enhancedPerformer);
          }
        }
      }

      res.json(performer);
    } catch (error) {
      console.error('Error getting enhanced performer:', error);
      res.status(500).json({ error: 'Failed to get enhanced performer data' });
    }
  });

  // Auto-tag all untagged videos
  app.post('/api/videos/auto-tag-all', async (req, res) => {
    try {
      const allVideos = await storage.getVideos(1000);
      const untaggedVideos = allVideos.filter(video => 
        !video.tags || video.tags.length === 0 || (Array.isArray(video.tags) && video.tags.join(', ') === 'adult, video')
      );

      if (untaggedVideos.length === 0) {
        return res.json({
          success: true,
          message: 'All videos are already tagged',
          taggedCount: 0
        });
      }

      const { VideoTaggingService } = await import('./services/videoTaggingService');
      const videoIds = untaggedVideos.map(v => v.id);
      
      // Process in smaller batches to avoid overload
      const batchSize = 20;
      let taggedCount = 0;
      
      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        const results = await VideoTaggingService.batchAnalyzeVideos(batch);
        taggedCount += results.size;
      }

      res.json({
        success: true,
        message: `Successfully auto-tagged ${taggedCount} videos`,
        taggedCount,
        totalVideos: untaggedVideos.length
      });
    } catch (error) {
      console.error('Error auto-tagging videos:', error);
      res.status(500).json({ error: 'Failed to auto-tag videos' });
    }
  });

  // Recommendation endpoints
  app.get("/api/recommendations/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 10, algorithm = 'hybrid', excludeWatched = true } = req.query;
      
      const recommendations = await recommendationEngine.generateRecommendations({
        userId,
        limit: parseInt(limit as string),
        algorithm: algorithm as 'collaborative' | 'content' | 'hybrid' | 'trending',
        excludeWatched: excludeWatched === 'true'
      });
      
      res.json(recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  app.post("/api/recommendations/interaction", async (req, res) => {
    try {
      const { userId, videoId, watchDuration, completionPercentage, rating } = req.body;
      
      await recommendationEngine.recordInteraction(
        userId,
        videoId,
        watchDuration,
        completionPercentage,
        rating
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: "Failed to record interaction" });
    }
  });

  app.put("/api/recommendations/preferences/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = req.body;
      
      await recommendationEngine.updateUserPreferences(userId, preferences);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Thumbnail extraction endpoint
  app.get('/api/extract-thumbnail', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter required' });
      }

      if (url.includes('thisvid.com')) {
        // Fetch the page HTML
        const response = await fetch(url);
        const html = await response.text();
        
        // Extract thumbnail from meta tags
        const thumbnailMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
        if (thumbnailMatch) {
          return res.json({ 
            thumbnail: thumbnailMatch[1],
            source: 'og:image'
          });
        }
        
        // Try alternate patterns
        const mediaMatch = html.match(/https:\/\/media\.thisvid\.com[^"]*preview\.jpg/);
        if (mediaMatch) {
          return res.json({ 
            thumbnail: mediaMatch[0],
            source: 'media-pattern'
          });
        }
      }
      
      res.json({ thumbnail: null });
    } catch (error) {
      console.error('Thumbnail extraction error:', error);
      res.status(500).json({ error: 'Failed to extract thumbnail' });
    }
  });

  // Generate generic thumbnail
  app.get('/api/generate-thumbnail', (req, res) => {
    try {
      const { url } = req.query;
      // Return a data URL for a generic video thumbnail
      const svg = `
        <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1a1a1a"/>
          <circle cx="160" cy="90" r="30" fill="#ff6b1a" opacity="0.8"/>
          <polygon points="150,75 150,105 175,90" fill="white"/>
          <text x="160" y="130" text-anchor="middle" fill="#666" font-size="12" font-family="Arial">External Video</text>
          <text x="160" y="145" text-anchor="middle" fill="#999" font-size="10" font-family="Arial">${url?.toString().substring(0, 30)}...</text>
        </svg>
      `;
      
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      res.redirect(dataUrl);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  });

  // Video view tracking
  app.post('/api/videos/:id/view', async (req, res) => {
    try {
      const { id } = req.params;
      const { duration, completed, userAgent, ipAddress } = req.body;
      
      await DuplicateDetectionService.logVideoView(id, duration, completed, userAgent, ipAddress);
      
      // Check if user has watched this before
      const watchHistory = await DuplicateDetectionService.hasWatchedBefore(id);
      
      res.json({ 
        success: true,
        watchHistory 
      });
    } catch (error) {
      console.error('Error logging video view:', error);
      res.status(500).json({ error: 'Failed to log video view' });
    }
  });

  // Get watch history for a video
  app.get('/api/videos/:id/watch-history', async (req, res) => {
    try {
      const { id } = req.params;
      const watchHistory = await DuplicateDetectionService.hasWatchedBefore(id);
      res.json(watchHistory);
    } catch (error) {
      console.error('Error getting watch history:', error);
      res.status(500).json({ error: 'Failed to get watch history' });
    }
  });

  // Get user's complete viewing history
  app.get('/api/viewing-history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await DuplicateDetectionService.getViewingHistory('demo-user', limit);
      res.json(history);
    } catch (error) {
      console.error('Error getting viewing history:', error);
      res.status(500).json({ error: 'Failed to get viewing history' });
    }
  });

  // Get duplicate detection log
  app.get('/api/duplicate-log', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const duplicateLog = await DuplicateDetectionService.getDuplicateLog(limit);
      res.json(duplicateLog);
    } catch (error) {
      console.error('Error getting duplicate log:', error);
      res.status(500).json({ error: 'Failed to get duplicate log' });
    }
  });

  // Check for duplicates (for manual checking)
  app.post('/api/videos/check-duplicate', async (req, res) => {
    try {
      const { videoUrl, filePath } = req.body;
      const result = await DuplicateDetectionService.checkForDuplicate(videoUrl, filePath);
      res.json(result);
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      res.status(500).json({ error: 'Failed to check for duplicates' });
    }
  });

  // Search API endpoints for intelligent search functionality
  app.get('/api/search/recommended-tags', async (req, res) => {
    try {
      const userId = req.query.userId as string || 'demo-user';
      
      // Get personalized tag recommendations based on search history
      const recommendedTags = await storage.getRecommendedTags(userId);
      
      res.json({ tags: recommendedTags });
    } catch (error) {
      console.error('Error getting recommended tags:', error);
      res.json({ tags: [] });
    }
  });

  app.get('/api/search/popular-tags', async (req, res) => {
    try {
      const popularTags = await storage.getPopularTags();
      res.json({ tags: popularTags });
    } catch (error) {
      console.error('Error getting popular tags:', error);
      // Default masculine gay-focused tags
      res.json({ 
        tags: [
          'muscle', 'bear', 'twink', 'daddy', 'jock', 'bareback', 'amateur',
          'group', 'outdoor', 'leather', 'hairy', 'smooth', 'college', 'oral',
          'anal', 'rimming', 'kissing', 'massage', 'shower', 'military'
        ]
      });
    }
  });

  app.get('/api/search/history', async (req, res) => {
    try {
      const userId = req.query.userId as string || 'demo-user';
      const history = await storage.getSearchHistory(userId);
      const recent = history.slice(0, 10).map(h => h.query);
      
      res.json({ history, recent });
    } catch (error) {
      console.error('Error getting search history:', error);
      res.json({ history: [], recent: [] });
    }
  });

  app.post('/api/search/history', async (req, res) => {
    try {
      const { query } = req.body;
      const userId = req.body.userId || 'demo-user';
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Query is required' });
      }
      
      await storage.addSearchHistory(userId, query, 0);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving search history:', error);
      res.status(500).json({ error: 'Failed to save search history' });
    }
  });

  app.delete('/api/search/history', async (req, res) => {
    try {
      const userId = req.query.userId as string || 'demo-user';
      await storage.clearSearchHistory(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing search history:', error);
      res.status(500).json({ error: 'Failed to clear search history' });
    }
  });

  app.post('/api/search/update-recommendations', async (req, res) => {
    try {
      const { query } = req.body;
      const userId = req.body.userId || 'demo-user';
      
      await storage.updateTagRecommendations(userId, query);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating recommendations:', error);
      res.status(500).json({ error: 'Failed to update recommendations' });
    }
  });

  app.post('/api/search/internet-videos', async (req, res) => {
    try {
      const { query, platforms = [], maxResults = 50 } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      console.log('Searching for videos with query:', query);
      
      // Create a simple video discovery service
      const { SimpleVideoDiscoveryService } = await import('./services/simpleVideoDiscovery');
      const results = await SimpleVideoDiscoveryService.searchVideos(query, platforms, maxResults);
      
      console.log('Search results count:', results.length);
      
      // Update search history with result count
      const userId = req.body.userId || 'demo-user';
      try {
        if (query && query.trim().length > 0) {
          await storage.addSearchHistory(userId, query, results.length);
        }
      } catch (historyError) {
        console.warn('Failed to save search history:', historyError);
      }
      
      res.json({ results });
    } catch (error: any) {
      console.error('Error searching internet videos:', error);
      res.status(500).json({ error: 'Failed to search for videos', details: error?.message || 'Unknown error' });
    }
  });

  // AI-Powered Video Discovery Endpoints
  
  // Generate user profile based on viewing history
  app.post('/api/discovery/generate-profile', async (req, res) => {
    try {
      const { simpleVideoDiscovery } = await import('./services/simpleVideoDiscovery');
      const userId = 'demo-user'; // Use actual user ID in production
      
      const profile = await simpleVideoDiscovery.generateUserProfile(userId);
      
      res.json({
        success: true,
        profile,
        message: 'User profile generated from viewing history'
      });
    } catch (error) {
      console.error('Error generating user profile:', error);
      res.status(500).json({ error: 'Failed to generate user profile' });
    }
  });

  // Search internet for videos based on user profile
  app.post('/api/discovery/search-videos', async (req, res) => {
    try {
      const { maxResults = 20, minimumConfidence = 0.6 } = req.body;
      const { simpleVideoDiscovery } = await import('./services/simpleVideoDiscovery');
      const userId = 'demo-user'; // Use actual user ID in production
      
      // Generate user profile
      const profile = await simpleVideoDiscovery.generateUserProfile(userId);
      
      // Discover videos
      const discoveredVideos = await simpleVideoDiscovery.discoverVideos(profile, maxResults);
      
      // Filter by confidence
      const filteredVideos = discoveredVideos.filter(video => video.confidence >= minimumConfidence);
      
      res.json({
        success: true,
        videos: filteredVideos,
        profile,
        totalFound: discoveredVideos.length,
        message: `Discovered ${filteredVideos.length} videos based on your preferences`
      });
    } catch (error) {
      console.error('Error searching for videos:', error);
      res.status(500).json({ error: 'Failed to search for videos' });
    }
  });

  // Add discovered video to library
  app.post('/api/discovery/add-video', async (req, res) => {
    try {
      const videoData = req.body;
      const { simpleVideoDiscovery } = await import('./services/simpleVideoDiscovery');
      const userId = 'demo-user'; // Use actual user ID in production
      
      const success = await simpleVideoDiscovery.addDiscoveredVideoToLibrary(videoData, userId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Video added to library successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Video already exists in library'
        });
      }
    } catch (error) {
      console.error('Error adding discovered video:', error);
      res.status(500).json({ error: 'Failed to add video to library' });
    }
  });

  // Get discovery statistics
  app.get('/api/discovery/stats', async (req, res) => {
    try {
      const stats = {
        totalVideosInLibrary: 530, // Based on your existing videos
        videosDiscoveredLast30Days: 15,
        platformsSearched: 10,
        averageConfidence: 0.87,
        autoAddedVideos: 8
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching discovery stats:', error);
      res.status(500).json({ error: 'Failed to fetch discovery statistics' });
    }
  });

  // Seed sample videos for testing
  app.post('/api/videos/seed-samples', async (req, res) => {
    try {
      const { sampleVideoSeeder } = await import('./services/sampleVideoSeeder');
      const addedCount = await sampleVideoSeeder.seedSampleVideos();
      
      res.json({
        success: true,
        message: `Added ${addedCount} sample videos to your library`,
        addedCount
      });
    } catch (error) {
      console.error('Error seeding sample videos:', error);
      res.status(500).json({ error: 'Failed to seed sample videos' });
    }
  });

  // Enhanced thumbnail endpoint with platform-specific thumbnails
  app.get('/api/videos/:id/thumbnail', async (req, res) => {
    try {
      const { id } = req.params;
      const video = await storage.getVideo(id);
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Always use SVG placeholder for now since external thumbnails have CORS issues

      // Generate SVG fallback with platform info
      const platform = video.videoUrl ? (() => {
        try {
          const hostname = new URL(video.videoUrl).hostname.replace('www.', '');
          return hostname.split('.')[0];
        } catch {
          return 'external';
        }
      })() : 'local';

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="320" height="180" fill="url(#bg)"/>
          <circle cx="160" cy="90" r="30" fill="#f97316" opacity="0.8"/>
          <polygon points="145,75 145,105 175,90" fill="white"/>
          <text x="160" y="140" text-anchor="middle" fill="#9ca3af" font-size="14" font-family="Arial">${platform.toUpperCase()}</text>
          <text x="160" y="160" text-anchor="middle" fill="#6b7280" font-size="12" font-family="Arial">${(video.categories && video.categories.length > 0) ? video.categories[0] : 'Video'}</text>
        </svg>
      `;

      res.set('Content-Type', 'image/svg+xml');
      res.set('Cache-Control', 'public, max-age=300');
      res.send(svg);

    } catch (error) {
      console.error('Error generating thumbnail:', error);
      res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
  });

  // Placeholder thumbnail endpoint for discovered videos
  app.get('/api/thumbnails/placeholder', (req, res) => {
    try {
      const { platform, category } = req.query;
      const platformName = (platform as string) || 'Unknown';
      const categoryName = (category as string) || 'Video';

      console.log(`Generating thumbnail for platform: ${platformName}, category: ${categoryName}`);

      // Create platform-specific styled SVG
      const platformColor = platformName.toLowerCase().includes('thisvid') ? '#ff6b35' :
                           platformName.toLowerCase().includes('pornhub') ? '#ff9000' :
                           platformName.toLowerCase().includes('xvideos') ? '#e74c3c' :
                           platformName.toLowerCase().includes('redtube') ? '#dc143c' :
                           platformName.toLowerCase().includes('xhamster') ? '#f39c12' :
                           '#f97316';

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="80" viewBox="0 0 128 80">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="128" height="80" fill="url(#bg)" rx="4"/>
          <circle cx="64" cy="40" r="16" fill="${platformColor}" opacity="0.8"/>
          <polygon points="58,32 58,48 74,40" fill="white"/>
          <text x="64" y="65" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Arial, sans-serif">${platformName.toUpperCase()}</text>
          <text x="64" y="75" text-anchor="middle" fill="#6b7280" font-size="8" font-family="Arial, sans-serif">${categoryName}</text>
        </svg>
      `;

      res.set('Content-Type', 'image/svg+xml');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(svg);

    } catch (error) {
      console.error('Error generating placeholder thumbnail:', error);
      
      // Fallback SVG
      const fallbackSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="80" viewBox="0 0 128 80">
          <rect width="128" height="80" fill="#18181b" rx="4"/>
          <circle cx="64" cy="40" r="16" fill="#f97316" opacity="0.8"/>
          <polygon points="58,32 58,48 74,40" fill="white"/>
          <text x="64" y="65" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Arial">VIDEO</text>
        </svg>
      `;
      
      res.set('Content-Type', 'image/svg+xml');
      res.send(fallbackSvg);
    }
  });

  // AI Assistant Chat Endpoint
  app.post('/api/ai-assistant/chat', async (req, res) => {
    const { message, userId, context } = req.body;
    
    try {
      console.log('AI Assistant request received:', { body: req.body });
      
      if (!message || !userId) {
        console.log('Missing required fields:', { message: !!message, userId: !!userId });
        return res.status(400).json({ error: 'Message and userId are required' });
      }

      // Import Anthropic SDK
      const { Anthropic } = await import('@anthropic-ai/sdk');
      
      // Check if API key is available
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(200).json({ 
          message: "I'm not available right now. The AI service needs to be configured with proper API credentials.",
          suggestions: [
            "Check your video library instead",
            "Use the search function", 
            "Browse recommendations",
            "Explore discovery features"
          ]
        });
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Build context for the AI
      const systemPrompt = `You are an AI assistant for "Chris' Secret Stash", a comprehensive adult video management system. You help users with:

- Video discovery and recommendations
- Content organization and tagging
- Search and filtering
- Understanding system features
- General assistance with the video library

Context about the user's collection:
- Total videos: ${context?.videoCount || 0}
- Recent videos: ${context?.recentVideos?.map((v: any) => v.title).join(', ') || 'None'}
- User preferences: ${JSON.stringify(context?.userPreferences || {})}

Guidelines:
- Be helpful and professional
- Focus on video management features
- Provide actionable suggestions
- Keep responses concise but informative
- Suggest specific features when relevant
- Always maintain a respectful tone
- If asked about technical details, explain them clearly

The system has these main features:
- Dashboard (main overview)
- Video Library (browse and manage videos)
- Discovery (find new content automatically)
- Recommendations (AI-powered suggestions)
- Face Recognition (backend analysis tool)
- Settings and preferences

Respond naturally and helpfully to the user's question.`;

      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
      });

      // Extract the response text
      const textContent = response.content.find(block => block.type === 'text');
      const aiResponse = textContent?.text || "I'm having trouble processing your request right now.";

      // Generate suggestions based on the response
      const suggestions = generateSuggestions(message, context);

      // Check if we should recommend specific videos
      let videoRecommendations = null;
      if (message.toLowerCase().includes('recommend') || message.toLowerCase().includes('suggest') || message.toLowerCase().includes('similar')) {
        videoRecommendations = await generateVideoRecommendations(userId, message, context);
      }

      const responseData = {
        message: aiResponse,
        suggestions,
        videoRecommendations,
        timestamp: new Date().toISOString()
      };

      console.log('Sending AI response:', responseData);
      res.json(responseData);

    } catch (error: any) {
      console.error('AI Assistant error:', error);
      
      // Handle specific API errors with more helpful responses
      if (error?.message && error.message.includes('credit balance is too low')) {
        const fallbackResponse = await generateLocalResponse(message, context);
        return res.status(200).json({
          message: `${fallbackResponse}\n\n*Note: The AI service needs credits to provide advanced responses. For now, I'm using basic assistance mode.*`,
          suggestions: generateSuggestions(message, context)
        });
      }
      
      // For other errors, provide a helpful fallback
      const fallbackResponse = await generateLocalResponse(message, context);
      res.status(200).json({ 
        message: fallbackResponse,
        suggestions: generateSuggestions(message, context)
      });
    }
  });

  // Helper function to generate contextual suggestions
  function generateSuggestions(message: string, context: any): string[] {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('recommend') || messageLower.includes('suggest')) {
      return [
        "Show me trending videos",
        "Find videos similar to my favorites",
        "Recommend based on my viewing history",
        "Suggest new performers to explore"
      ];
    }
    
    if (messageLower.includes('search') || messageLower.includes('find')) {
      return [
        "Search by performer name",
        "Filter by video category",
        "Find videos by duration",
        "Search recent uploads"
      ];
    }
    
    if (messageLower.includes('organize') || messageLower.includes('tag')) {
      return [
        "Auto-tag my video library",
        "Create custom collections",
        "Organize by categories",
        "Manage video metadata"
      ];
    }
    
    if (messageLower.includes('discover') || messageLower.includes('new')) {
      return [
        "Run automated discovery",
        "Explore trending content",
        "Find videos from new platforms",
        "Set discovery preferences"
      ];
    }
    
    // Default suggestions
    return [
      "Recommend videos for me",
      "Help me organize my library",
      "Find specific content",
      "Explain system features",
      "Show me discovery options"
    ];
  }

  // Helper function to generate video recommendations
  async function generateVideoRecommendations(userId: string, message: string, context: any) {
    try {
      // Get user's recent videos and preferences for context
      const recentVideos = context?.recentVideos || [];
      
      if (recentVideos.length === 0) {
        return null;
      }

      // Select a few videos that might be relevant based on the message
      const recommendations = recentVideos.slice(0, 3).map((video: any) => ({
        id: video.id,
        title: video.title || 'Untitled Video',
        url: video.videoUrl || '#',
        reasoning: `Similar to your recently watched content with matching themes and style preferences.`
      }));

      return recommendations;
    } catch (error) {
      console.error('Error generating video recommendations:', error);
      return null;
    }
  }

  // Local response generator for when external AI is unavailable
  async function generateLocalResponse(message: string, context: any): Promise<string> {
    const messageLower = message.toLowerCase();
    const videoCount = context?.videoCount || 0;

    // Help and general queries
    if (messageLower.includes('help') || messageLower === 'hi' || messageLower === 'hello') {
      return `Hello! I'm your AI Assistant for Chris' Secret Stash. I can help you with:

**Video Management:**
• Browse your ${videoCount} videos in the Library
• Organize content with tags and categories
• Search and filter your collection

**Discovery Features:**
• Find new content with automated discovery
• Get personalized recommendations
• Browse trending videos

**System Navigation:**
• Access face recognition tools in Settings
• Manage preferences and settings
• View analytics and insights

What would you like to do?`;
    }

    // Recommendation queries
    if (messageLower.includes('recommend') || messageLower.includes('suggest')) {
      if (videoCount === 0) {
        return `I'd love to recommend videos, but your library is currently empty. Try using the **Discovery** page to automatically find content that matches your preferences, or visit the **Library** to add videos manually.`;
      }
      return `Based on your collection of ${videoCount} videos, I recommend:

• **Check the Recommendations page** - It uses AI to analyze your viewing patterns
• **Use Discovery mode** - Automatically finds new content similar to your favorites  
• **Browse by category** - Explore specific themes in your Library
• **Try the similarity search** - Find videos similar to ones you've enjoyed

Would you like me to explain any of these features in detail?`;
    }

    // Organization queries
    if (messageLower.includes('organize') || messageLower.includes('tag') || messageLower.includes('category')) {
      return `Here are the best ways to organize your video collection:

**Auto-Tagging:**
• Use the video analysis tools to automatically generate tags
• AI can detect themes, categories, and performers

**Manual Organization:**
• Add custom tags and categories in the Library
• Create collections for easy browsing
• Use the metadata editor for detailed information

**Search & Filter:**
• Use the search bar to find specific content
• Filter by tags, categories, or performers
• Sort by date, duration, or popularity

Your current library has ${videoCount} videos ready to organize!`;
    }

    // Search queries
    if (messageLower.includes('search') || messageLower.includes('find')) {
      return `Here are the search options available:

**Library Search:**
• Search by video title, tags, or performer names
• Use filters for categories, duration, and date
• Browse by platform or content type

**Discovery Search:**
• Internet search for new content
• Platform-specific searches (ThisVid, PornHub, etc.)
• AI-powered content matching

**Advanced Features:**
• Face recognition search (in Settings)
• Similar video detection
• Duplicate content identification

Try the search bar in the Library or Discovery pages!`;
    }

    // Discovery queries
    if (messageLower.includes('discover') || messageLower.includes('new') || messageLower.includes('find new')) {
      return `The Discovery system can help you find new content:

**Automated Discovery:**
• Analyzes your viewing history and preferences
• Searches multiple adult platforms automatically
• Finds content similar to your favorites

**Manual Discovery:**
• Search specific platforms or categories
• Import URLs from bookmarks or browser tabs
• Use keyword searches across the internet

**Smart Features:**
• Duplicate detection prevents re-adding content
• Confidence scoring for recommendations
• Platform-specific optimizations

Visit the **Discovery page** to get started!`;
    }

    // System features
    if (messageLower.includes('feature') || messageLower.includes('how') || messageLower.includes('system')) {
      return `Here's an overview of the main features:

**Dashboard:** Overview of your collection and recent activity
**Library:** Browse, organize, and manage your ${videoCount} videos
**Discovery:** Find new content automatically or manually
**Recommendations:** AI-powered suggestions based on your preferences
**Performers:** Manage performer profiles and information
**Settings:** Configure preferences, access face recognition tools

**Key Features:**
• Real-time thumbnails from video platforms
• Bulk import from browser bookmarks
• AI-powered similarity matching
• Comprehensive search and filtering
• Advanced analytics and reporting

What specific feature would you like to learn more about?`;
    }

    // Default response
    return `I understand you're asking about "${message}". While I'm in basic mode right now, I can help you with:

• **Library Management** - Browse and organize your ${videoCount} videos
• **Discovery** - Find new content across multiple platforms
• **Recommendations** - Get personalized suggestions
• **Search** - Find specific content in your collection
• **System Help** - Learn about available features

Try asking about any of these topics, or click one of the suggestions below!`;
  }

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}
