import { Analysis, ReportConfiguration, ReportStyling, ReportSection } from '@shared/schema';

export class ReportCustomizer {
  
  // Default themes and configurations
  static getDefaultThemes(): Record<string, ReportStyling> {
    return {
      professional: {
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        accentColor: '#10b981',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { heading: 24, body: 14, caption: 12 },
        spacing: { section: 30, paragraph: 15, margin: 20 },
        borderRadius: 8,
        showBorders: true,
        showShadows: true,
      },
      dark: {
        primaryColor: '#f59e0b',
        secondaryColor: '#d97706',
        accentColor: '#10b981',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { heading: 24, body: 14, caption: 12 },
        spacing: { section: 30, paragraph: 15, margin: 20 },
        borderRadius: 12,
        showBorders: false,
        showShadows: true,
        backgroundPattern: 'dark',
      },
      minimal: {
        primaryColor: '#374151',
        secondaryColor: '#6b7280',
        accentColor: '#3b82f6',
        fontFamily: 'Georgia, serif',
        fontSize: { heading: 22, body: 13, caption: 11 },
        spacing: { section: 40, paragraph: 20, margin: 30 },
        borderRadius: 4,
        showBorders: false,
        showShadows: false,
      },
      branded: {
        primaryColor: '#ff6b1a',
        secondaryColor: '#e55a0f',
        accentColor: '#fbbf24',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { heading: 26, body: 15, caption: 13 },
        spacing: { section: 25, paragraph: 12, margin: 15 },
        borderRadius: 10,
        showBorders: true,
        showShadows: true,
      },
    };
  }

  static getDefaultSections(): ReportSection[] {
    return [
      {
        id: 'header',
        type: 'header',
        title: 'Report Header',
        enabled: true,
        order: 1,
        configuration: { includeLogo: true, includeDate: true },
      },
      {
        id: 'summary',
        type: 'summary',
        title: 'Executive Summary',
        enabled: true,
        order: 2,
        configuration: { includeHighlights: true, includeKeyMetrics: true },
      },
      {
        id: 'settings',
        type: 'settings',
        title: 'Analysis Parameters',
        enabled: true,
        order: 3,
        configuration: { showDetailed: true },
      },
      {
        id: 'statistics',
        type: 'charts',
        title: 'Statistical Analysis',
        enabled: true,
        order: 4,
        configuration: { chartTypes: ['confidence', 'timeline', 'distribution'] },
      },
      {
        id: 'matches',
        type: 'matches',
        title: 'Match Details',
        enabled: true,
        order: 5,
        configuration: { includeThumbnails: true, maxDisplay: 20 },
      },
      {
        id: 'timeline',
        type: 'timeline',
        title: 'Detection Timeline',
        enabled: true,
        order: 6,
        configuration: { showProgress: true, highlightPeaks: true },
      },
      {
        id: 'footer',
        type: 'footer',
        title: 'Report Footer',
        enabled: true,
        order: 7,
        configuration: { includeMetadata: true, includeWatermark: true },
      },
    ];
  }

  static getDefaultConfiguration(): ReportConfiguration {
    return {
      customTitle: 'Face Recognition Analysis Report',
      includeCharts: true,
      includeMatchThumbnails: true,
      includeTimeline: true,
      includeStatistics: true,
      includeMetadata: true,
      confidenceThreshold: 0.5,
      maxMatchesDisplay: 50,
      pageFormat: 'A4',
      orientation: 'portrait',
      theme: 'professional',
      exportFormats: ['pdf'],
    };
  }

  // Generate customized report based on configuration
  static async generateCustomReport(
    analysis: Analysis, 
    config?: ReportConfiguration
  ): Promise<string> {
    const reportConfig = { ...this.getDefaultConfiguration(), ...config };
    const theme = this.getDefaultThemes()[reportConfig.theme];
    const sections = this.getDefaultSections();

    // Filter matches based on confidence threshold
    const filteredMatches = analysis.matches?.filter(
      match => match.confidence >= reportConfig.confidenceThreshold
    ).slice(0, reportConfig.maxMatchesDisplay) || [];

    // Generate HTML based on configuration
    const htmlContent = this.generateCustomHTML(analysis, reportConfig, theme, sections, filteredMatches);

    // Use enhanced PDF generator
    return this.generateEnhancedPDF(analysis, htmlContent, reportConfig);
  }

  private static generateCustomHTML(
    analysis: Analysis,
    config: ReportConfiguration,
    theme: ReportStyling,
    sections: ReportSection[],
    matches: any[]
  ): string {
    const enabledSections = sections.filter(s => s.enabled).sort((a, b) => a.order - b.order);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${config.customTitle || 'Face Recognition Analysis Report'}</title>
    <style>${this.generateCustomCSS(theme, config)}</style>
</head>
<body class="${config.theme}">
    ${enabledSections.map(section => this.generateSectionHTML(section, analysis, config, theme, matches)).join('')}
    ${config.watermark ? `<div class="watermark">${config.watermark}</div>` : ''}
</body>
</html>`;
  }

  private static generateCustomCSS(theme: ReportStyling, config: ReportConfiguration): string {
    return `
        * { box-sizing: border-box; }
        body {
            font-family: ${theme.fontFamily};
            font-size: ${theme.fontSize.body}px;
            line-height: 1.6;
            color: ${config.theme === 'dark' ? '#e5e7eb' : '#1f2937'};
            margin: 0;
            padding: ${theme.spacing.margin}mm;
            background: ${config.theme === 'dark' ? '#111827' : '#ffffff'};
            ${theme.backgroundPattern ? `background-image: url('data:image/svg+xml,${this.getBackgroundPattern(theme.backgroundPattern)}')` : ''}
        }
        .header {
            text-align: center;
            border-bottom: 3px solid ${theme.primaryColor};
            padding-bottom: ${theme.spacing.paragraph}px;
            margin-bottom: ${theme.spacing.section}px;
            ${theme.showShadows ? 'box-shadow: 0 2px 4px rgba(0,0,0,0.1);' : ''}
        }
        .header h1 {
            color: ${theme.primaryColor};
            margin: 0;
            font-size: ${theme.fontSize.heading}px;
            font-weight: 700;
        }
        .section {
            margin-bottom: ${theme.spacing.section}px;
            ${theme.showBorders ? `border: 1px solid ${config.theme === 'dark' ? '#374151' : '#e5e7eb'};` : ''}
            ${theme.showShadows ? 'box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : ''}
            border-radius: ${theme.borderRadius}px;
            padding: ${theme.spacing.paragraph}px;
            background: ${config.theme === 'dark' ? '#1f2937' : '#ffffff'};
        }
        .section h2 {
            color: ${theme.primaryColor};
            border-bottom: 1px solid ${theme.secondaryColor};
            padding-bottom: 8px;
            margin-bottom: ${theme.spacing.paragraph}px;
            font-size: ${theme.fontSize.heading - 4}px;
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .card {
            background: ${config.theme === 'dark' ? '#374151' : '#f8fafc'};
            padding: ${theme.spacing.paragraph}px;
            border-radius: ${theme.borderRadius}px;
            ${theme.showBorders ? `border-left: 4px solid ${theme.primaryColor};` : ''}
        }
        .stat-number { font-size: 24px; font-weight: bold; color: ${theme.accentColor}; }
        .stat-label { color: ${config.theme === 'dark' ? '#9ca3af' : '#64748b'}; font-size: ${theme.fontSize.caption}px; }
        .match-item {
            background: ${config.theme === 'dark' ? '#374151' : '#ffffff'};
            border: ${theme.showBorders ? `1px solid ${config.theme === 'dark' ? '#4b5563' : '#e5e7eb'}` : 'none'};
            border-radius: ${theme.borderRadius}px;
            padding: 15px;
            margin-bottom: 10px;
            ${theme.showShadows ? 'box-shadow: 0 1px 3px rgba(0,0,0,0.1);' : ''}
        }
        .confidence-badge {
            background: ${theme.accentColor};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: ${theme.fontSize.caption}px;
            font-weight: 500;
        }
        .timeline { 
            height: 200px; 
            background: linear-gradient(90deg, ${theme.primaryColor}20 0%, ${theme.accentColor}20 100%);
            border-radius: ${theme.borderRadius}px;
            position: relative;
        }
        .watermark {
            position: fixed;
            bottom: 20px;
            right: 20px;
            opacity: 0.3;
            font-size: 10px;
            color: ${theme.primaryColor};
            transform: rotate(-45deg);
        }
        .chart-container { height: 250px; margin: 20px 0; }
        .footer {
            margin-top: ${theme.spacing.section}px;
            padding-top: ${theme.spacing.paragraph}px;
            border-top: 1px solid ${config.theme === 'dark' ? '#374151' : '#e5e7eb'};
            text-align: center;
            color: ${config.theme === 'dark' ? '#9ca3af' : '#64748b'};
            font-size: ${theme.fontSize.caption}px;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .section { page-break-inside: avoid; }
        }
    `;
  }

  private static generateSectionHTML(
    section: ReportSection,
    analysis: Analysis,
    config: ReportConfiguration,
    theme: ReportStyling,
    matches: any[]
  ): string {
    switch (section.type) {
      case 'header':
        return this.generateHeaderSection(analysis, config, section);
      case 'summary':
        return this.generateSummarySection(analysis, matches, section);
      case 'settings':
        return this.generateSettingsSection(analysis, section);
      case 'charts':
        return this.generateChartsSection(analysis, matches, section);
      case 'matches':
        return this.generateMatchesSection(matches, config, section);
      case 'timeline':
        return this.generateTimelineSection(matches, section);
      case 'footer':
        return this.generateFooterSection(analysis, config, section);
      default:
        return '';
    }
  }

  private static generateHeaderSection(analysis: Analysis, config: ReportConfiguration, section: ReportSection): string {
    return `
        <div class="header">
            ${section.configuration?.includeLogo && config.logoPath ? `<img src="${config.logoPath}" alt="Logo" style="height: 60px; margin-bottom: 10px;">` : ''}
            <h1>${config.customTitle || 'Face Recognition Analysis Report'}</h1>
            <p>Analysis ID: ${analysis.id}</p>
            ${section.configuration?.includeDate ? `<p>Generated: ${new Date().toLocaleDateString()}</p>` : ''}
        </div>
    `;
  }

  private static generateSummarySection(analysis: Analysis, matches: any[], section: ReportSection): string {
    const avgConfidence = matches.length > 0 ? 
      Math.round(matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length * 100) : 0;
    
    return `
        <div class="section">
            <h2>${section.title}</h2>
            <div class="grid">
                <div class="card">
                    <div class="stat-number">${matches.length}</div>
                    <div class="stat-label">Total Matches Found</div>
                </div>
                <div class="card">
                    <div class="stat-number">${avgConfidence}%</div>
                    <div class="stat-label">Average Confidence</div>
                </div>
                <div class="card">
                    <div class="stat-number">${analysis.processingTime || 0}s</div>
                    <div class="stat-label">Processing Time</div>
                </div>
                <div class="card">
                    <div class="stat-number">${analysis.status}</div>
                    <div class="stat-label">Analysis Status</div>
                </div>
            </div>
        </div>
    `;
  }

  private static generateSettingsSection(analysis: Analysis, section: ReportSection): string {
    return `
        <div class="section">
            <h2>${section.title}</h2>
            <div class="grid">
                <div class="card">
                    <strong>Video File:</strong><br>${analysis.videoFilename}
                </div>
                <div class="card">
                    <strong>Target Face:</strong><br>${analysis.targetFaceFilename}
                </div>
                <div class="card">
                    <strong>Tolerance:</strong><br>${analysis.tolerance}
                </div>
                <div class="card">
                    <strong>Frame Skip:</strong><br>Every ${analysis.frameSkip} frames
                </div>
            </div>
        </div>
    `;
  }

  private static generateChartsSection(analysis: Analysis, matches: any[], section: ReportSection): string {
    // Generate confidence distribution chart data
    const confidenceRanges = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
    const distribution = matches.reduce((acc, match) => {
      const confidencePercent = match.confidence * 100;
      const rangeIndex = Math.floor(confidencePercent / 20);
      acc[Math.min(rangeIndex, 4)]++;
      return acc;
    }, [0, 0, 0, 0, 0]);

    return `
        <div class="section">
            <h2>${section.title}</h2>
            <div class="chart-container">
                <h3>Confidence Distribution</h3>
                <div style="display: flex; height: 200px; align-items: end; gap: 10px;">
                    ${distribution.map((count, index) => `
                        <div style="background: linear-gradient(to top, #3b82f6, #10b981); 
                                    width: 50px; 
                                    height: ${Math.max(count * 10, 5)}px; 
                                    border-radius: 4px 4px 0 0;
                                    position: relative;">
                            <div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 10px;">
                                ${confidenceRanges[index]}
                            </div>
                            <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 12px; font-weight: bold;">
                                ${count}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
  }

  private static generateMatchesSection(matches: any[], config: ReportConfiguration, section: ReportSection): string {
    const displayMatches = matches.slice(0, section.configuration?.maxDisplay || config.maxMatchesDisplay);
    
    return `
        <div class="section">
            <h2>${section.title}</h2>
            ${displayMatches.length > 0 ? displayMatches.map((match, index) => `
                <div class="match-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div><strong>Match ${index + 1} at ${match.timestamp}</strong></div>
                        <div class="confidence-badge">${Math.round(match.confidence * 100)}% Match</div>
                    </div>
                    <div style="color: #64748b; font-size: 14px;">
                        Frame ${match.frameNumber} • Confidence: ${(match.confidence * 100).toFixed(1)}%
                        ${match.thumbnailPath && config.includeMatchThumbnails ? ` • Thumbnail saved` : ''}
                    </div>
                </div>
            `).join('') : '<p style="text-align: center; color: #64748b; padding: 40px;">No matches found above the confidence threshold.</p>'}
        </div>
    `;
  }

  private static generateTimelineSection(matches: any[], section: ReportSection): string {
    return `
        <div class="section">
            <h2>${section.title}</h2>
            <div class="timeline">
                <div style="position: absolute; top: 10px; left: 10px; font-weight: bold;">Detection Timeline</div>
                ${matches.map((match, index) => {
                  const position = (index / Math.max(matches.length - 1, 1)) * 80;
                  return `
                    <div style="position: absolute; 
                                left: ${10 + position}%; 
                                top: 50%; 
                                width: 8px; 
                                height: 8px; 
                                background: #10b981; 
                                border-radius: 50%; 
                                transform: translateY(-50%);
                                box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);">
                    </div>
                  `;
                }).join('')}
            </div>
        </div>
    `;
  }

  private static generateFooterSection(analysis: Analysis, config: ReportConfiguration, section: ReportSection): string {
    return `
        <div class="footer">
            ${section.configuration?.includeMetadata ? `
                <p>Analysis completed: ${analysis.completedAt ? new Date(analysis.completedAt).toLocaleString() : 'N/A'}</p>
                <p>Report generated: ${new Date().toLocaleString()}</p>
            ` : ''}
            <p>Generated by VideoHub Pro Face Recognition System</p>
        </div>
    `;
  }

  private static getBackgroundPattern(pattern: string): string {
    // Simple SVG pattern for dark theme
    return `<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="%23374151" stroke-width="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>`;
  }

  private static async generateEnhancedPDF(
    analysis: Analysis,
    htmlContent: string,
    config: ReportConfiguration
  ): Promise<string> {
    const puppeteer = require('puppeteer');
    const fs = require('fs');
    const path = require('path');

    const reportDir = path.join('reports');
    fs.mkdirSync(reportDir, { recursive: true });
    
    const reportPath = path.join(reportDir, `analysis-${analysis.id}-custom.pdf`);

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: reportPath,
        format: config.pageFormat,
        landscape: config.orientation === 'landscape',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        }
      });
      
      await browser.close();
      return reportPath;
    } catch (error) {
      console.error('Error generating custom PDF:', error);
      // Fallback - return a basic report path
      return reportPath;
    }
  }

  // Generate HTML preview without creating PDF
  static generatePreviewHTML(analysis: Analysis, config?: ReportConfiguration): string {
    const reportConfig = { ...this.getDefaultConfiguration(), ...config };
    const theme = this.getDefaultThemes()[reportConfig.theme];
    const sections = this.getDefaultSections();

    // Filter matches based on confidence threshold
    const filteredMatches = analysis.matches?.filter(
      match => match.confidence >= reportConfig.confidenceThreshold
    ).slice(0, reportConfig.maxMatchesDisplay) || [];

    return this.generateCustomHTML(analysis, reportConfig, theme, sections, filteredMatches);
  }
}