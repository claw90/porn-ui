import { Analysis } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

export async function generatePDFReport(analysis: Analysis): Promise<string> {
  const reportDir = path.join('reports');
  fs.mkdirSync(reportDir, { recursive: true });
  
  const reportPath = path.join(reportDir, `analysis-${analysis.id}.pdf`);
  
  // Generate HTML content for the PDF
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Face Recognition Analysis Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e40af;
            margin: 0;
            font-size: 28px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #1e40af;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-item {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .info-item .label {
            font-weight: 600;
            color: #475569;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-item .value {
            font-size: 18px;
            color: #1e293b;
            margin-top: 5px;
        }
        .match-item {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .match-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .match-title {
            font-weight: 600;
            color: #1e293b;
        }
        .confidence-badge {
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        .match-details {
            color: #64748b;
            font-size: 14px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            text-align: center;
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
        }
        .stat-label {
            color: #64748b;
            font-size: 14px;
            margin-top: 5px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #64748b;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Face Recognition Analysis Report</h1>
        <p>Analysis ID: ${analysis.id}</p>
    </div>

    <div class="section">
        <h2>File Information</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Video File</div>
                <div class="value">${analysis.videoFilename}</div>
            </div>
            <div class="info-item">
                <div class="label">Target Face</div>
                <div class="value">${analysis.targetFaceFilename}</div>
            </div>
            <div class="info-item">
                <div class="label">Created</div>
                <div class="value">${new Date(analysis.createdAt!).toLocaleString()}</div>
            </div>
            <div class="info-item">
                <div class="label">Completed</div>
                <div class="value">${analysis.completedAt ? new Date(analysis.completedAt).toLocaleString() : 'N/A'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Analysis Settings</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Match Tolerance</div>
                <div class="value">${analysis.tolerance}</div>
            </div>
            <div class="info-item">
                <div class="label">Frame Skip Rate</div>
                <div class="value">Every ${analysis.frameSkip} frames</div>
            </div>
            <div class="info-item">
                <div class="label">Thumbnails</div>
                <div class="value">${analysis.includeThumbnails ? 'Enabled' : 'Disabled'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Results Summary</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${analysis.processingTime || 0}s</div>
                <div class="stat-label">Processing Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${analysis.matchCount || 0}</div>
                <div class="stat-label">Total Matches</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${analysis.matches ? Math.round(analysis.matches.reduce((avg, match) => avg + match.confidence, 0) / analysis.matches.length * 100) || 0 : 0}%</div>
                <div class="stat-label">Avg Confidence</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Match Details</h2>
        ${analysis.matches && analysis.matches.length > 0 ? 
          analysis.matches.map((match, index) => `
            <div class="match-item">
                <div class="match-header">
                    <div class="match-title">Match ${index + 1} at ${match.timestamp}</div>
                    <div class="confidence-badge">${Math.round(match.confidence * 100)}% Match</div>
                </div>
                <div class="match-details">
                    Frame ${match.frameNumber} • Confidence: ${(match.confidence * 100).toFixed(1)}%
                    ${match.thumbnailPath ? ` • Thumbnail saved` : ''}
                </div>
            </div>
          `).join('') : 
          '<p style="text-align: center; color: #64748b; padding: 40px;">No matches found in this video.</p>'
        }
    </div>

    <div class="footer">
        <p>Generated on ${new Date().toLocaleString()} by Video Face Recognition Analyzer</p>
    </div>
</body>
</html>`;

  try {
    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: reportPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    await browser.close();
    
    return reportPath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to text report if PDF generation fails
    const textReportPath = path.join(reportDir, `analysis-${analysis.id}.txt`);
    const textContent = `
VIDEO FACE RECOGNITION ANALYSIS REPORT
=====================================

Analysis ID: ${analysis.id}
Video File: ${analysis.videoFilename}
Target Face: ${analysis.targetFaceFilename}
Created: ${analysis.createdAt}
Completed: ${analysis.completedAt}

SETTINGS
--------
Match Tolerance: ${analysis.tolerance}
Frame Skip Rate: ${analysis.frameSkip}
Include Thumbnails: ${analysis.includeThumbnails ? 'Yes' : 'No'}

RESULTS
-------
Processing Time: ${analysis.processingTime}s
Total Matches Found: ${analysis.matchCount}

MATCH DETAILS
------------
${analysis.matches ? analysis.matches.map((match, index) => `
Match ${index + 1}:
  Frame Number: ${match.frameNumber}
  Timestamp: ${match.timestamp}
  Confidence: ${(match.confidence * 100).toFixed(1)}%
  ${match.thumbnailPath ? `Thumbnail: ${match.thumbnailPath}` : ''}
`).join('\n') : 'No matches found'}

Generated on: ${new Date().toISOString()}
`;
    fs.writeFileSync(textReportPath, textContent);
    return textReportPath;
  }
}
