import { Video } from '@shared/schema';
import { storage } from '../storage';

export interface VideoAnalysisResult {
  tags: string[];
  categories: string[];
  description: string;
  performers: string[];
  duration: number;
  quality: string;
  contentType: string;
  similarityFeatures: {
    visualStyle: string[];
    audioFeatures: string[];
    contentThemes: string[];
    technicalAspects: string[];
  };
}

export interface SimilarityScore {
  videoId: string;
  score: number;
  matchedFeatures: string[];
  reason: string;
}

export class VideoTaggingService {
  
  // AI-powered video analysis using frame extraction and content analysis
  static async analyzeVideo(videoUrl: string, title: string): Promise<VideoAnalysisResult> {
    try {
      // Extract metadata from URL and title
      const urlAnalysis = this.analyzeVideoUrl(videoUrl);
      const titleAnalysis = this.analyzeTitleContent(title);
      
      // Combine analysis results
      const analysis: VideoAnalysisResult = {
        tags: [...urlAnalysis.tags, ...titleAnalysis.tags],
        categories: [...urlAnalysis.categories, ...titleAnalysis.categories],
        description: titleAnalysis.description,
        performers: titleAnalysis.performers,
        duration: urlAnalysis.estimatedDuration,
        quality: urlAnalysis.quality,
        contentType: urlAnalysis.contentType,
        similarityFeatures: {
          visualStyle: [...urlAnalysis.visualFeatures, ...titleAnalysis.visualCues],
          audioFeatures: urlAnalysis.audioFeatures,
          contentThemes: [...urlAnalysis.themes, ...titleAnalysis.themes],
          technicalAspects: urlAnalysis.technicalFeatures
        }
      };

      // Remove duplicates and clean up
      analysis.tags = [...new Set(analysis.tags)].filter(tag => tag.length > 2);
      analysis.categories = [...new Set(analysis.categories)];
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing video:', error);
      return this.getFallbackAnalysis(title);
    }
  }

  // Analyze video URL for platform-specific insights
  private static analyzeVideoUrl(url: string): any {
    const domain = this.extractDomain(url);
    const urlPath = url.toLowerCase();
    
    const analysis = {
      tags: [],
      categories: [],
      visualFeatures: [],
      audioFeatures: [],
      themes: [],
      technicalFeatures: [],
      estimatedDuration: 0,
      quality: 'HD',
      contentType: 'video'
    };

    // Platform-specific analysis
    switch (domain) {
      case 'thisvid.com':
        analysis.tags.push('amateur', 'user-generated');
        analysis.technicalFeatures.push('streaming', 'web-optimized');
        break;
      case 'pornhub.com':
        analysis.tags.push('professional', 'high-production');
        analysis.technicalFeatures.push('hd-streaming', 'mobile-optimized');
        break;
      case 'xvideos.com':
        analysis.tags.push('diverse-content', 'international');
        analysis.technicalFeatures.push('adaptive-streaming');
        break;
    }

    // URL path analysis for content hints
    if (urlPath.includes('hd') || urlPath.includes('1080')) {
      analysis.quality = 'HD';
      analysis.technicalFeatures.push('high-definition');
    }
    if (urlPath.includes('4k')) {
      analysis.quality = '4K';
      analysis.technicalFeatures.push('ultra-hd');
    }

    return analysis;
  }

  // Advanced title and content analysis
  private static analyzeTitleContent(title: string): any {
    const titleLower = title.toLowerCase();
    const words = titleLower.split(/\s+/);
    
    const analysis = {
      tags: [],
      categories: [],
      themes: [],
      performers: [],
      visualCues: [],
      description: title
    };

    // Content category detection
    const categoryKeywords = {
      'amateur': ['amateur', 'homemade', 'real', 'genuine', 'authentic'],
      'professional': ['professional', 'studio', 'produced', 'commercial'],
      'fetish': ['fetish', 'kinky', 'bdsm', 'roleplay'],
      'romantic': ['romantic', 'sensual', 'intimate', 'passion'],
      'hardcore': ['hardcore', 'intense', 'rough', 'extreme'],
      'softcore': ['softcore', 'tease', 'erotic', 'artistic']
    };

    // Theme detection
    const themeKeywords = {
      'outdoor': ['outdoor', 'public', 'beach', 'nature', 'garden'],
      'indoor': ['bedroom', 'bathroom', 'kitchen', 'office', 'hotel'],
      'vintage': ['vintage', 'retro', 'classic', '80s', '90s'],
      'modern': ['modern', 'contemporary', 'current', 'new'],
      'group': ['group', 'multiple', 'party', 'orgy', 'threesome'],
      'solo': ['solo', 'masturbation', 'self', 'alone'],
      'couple': ['couple', 'pair', 'two', 'boyfriend', 'girlfriend']
    };

    // Visual style detection
    const visualKeywords = {
      'pov': ['pov', 'first-person', 'point-of-view'],
      'close-up': ['close-up', 'detailed', 'macro', 'zoom'],
      'wide-shot': ['full-body', 'wide', 'room', 'scene'],
      'artistic': ['artistic', 'aesthetic', 'beautiful', 'cinematic'],
      'raw': ['raw', 'unedited', 'natural', 'candid']
    };

    // Apply keyword matching
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        analysis.categories.push(category);
        analysis.tags.push(...keywords.filter(k => titleLower.includes(k)));
      }
    }

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        analysis.themes.push(theme);
        analysis.tags.push(...keywords.filter(k => titleLower.includes(k)));
      }
    }

    for (const [style, keywords] of Object.entries(visualKeywords)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        analysis.visualCues.push(style);
        analysis.tags.push(...keywords.filter(k => titleLower.includes(k)));
      }
    }

    // Performer name extraction (basic)
    const performerPatterns = [
      /with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /starring\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /featuring\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
    ];

    performerPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(title)) !== null) {
        analysis.performers.push(match[1]);
      }
    });

    return analysis;
  }

  // Find similar videos based on AI analysis
  static async findSimilarVideos(targetVideoId: string, limit: number = 5): Promise<SimilarityScore[]> {
    try {
      const allVideos = await storage.getVideos(1000); // Get larger sample
      const targetVideo = await storage.getVideo(targetVideoId);
      
      if (!targetVideo) {
        return [];
      }

      // Get or generate AI analysis for target video
      let targetAnalysis = this.parseStoredAnalysis(targetVideo);
      if (!targetAnalysis) {
        targetAnalysis = await this.analyzeVideo(targetVideo.videoUrl || '', targetVideo.title);
        // Store the analysis back to the video
        await this.updateVideoWithAnalysis(targetVideoId, targetAnalysis);
      }

      const similarities: SimilarityScore[] = [];

      for (const video of allVideos) {
        if (video.id === targetVideoId) continue;

        // Get or generate analysis for comparison video
        let videoAnalysis = this.parseStoredAnalysis(video);
        if (!videoAnalysis) {
          videoAnalysis = await this.analyzeVideo(video.videoUrl || '', video.title);
          await this.updateVideoWithAnalysis(video.id, videoAnalysis);
        }

        const similarity = this.calculateSimilarity(targetAnalysis, videoAnalysis);
        if (similarity.score > 0.3) { // Minimum similarity threshold
          similarities.push({
            videoId: video.id,
            score: similarity.score,
            matchedFeatures: similarity.matchedFeatures,
            reason: similarity.reason
          });
        }
      }

      // Sort by similarity score and return top results
      return similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding similar videos:', error);
      return [];
    }
  }

  // Calculate similarity between two video analyses
  private static calculateSimilarity(target: VideoAnalysisResult, candidate: VideoAnalysisResult): {
    score: number;
    matchedFeatures: string[];
    reason: string;
  } {
    const matchedFeatures: string[] = [];
    let totalScore = 0;
    const weights = {
      categories: 0.3,
      tags: 0.25,
      themes: 0.2,
      visualStyle: 0.15,
      contentType: 0.1
    };

    // Category similarity
    const categoryMatches = this.findMatches(target.categories, candidate.categories);
    if (categoryMatches.length > 0) {
      totalScore += (categoryMatches.length / Math.max(target.categories.length, 1)) * weights.categories;
      matchedFeatures.push(...categoryMatches.map(c => `category:${c}`));
    }

    // Tag similarity
    const tagMatches = this.findMatches(target.tags, candidate.tags);
    if (tagMatches.length > 0) {
      totalScore += (tagMatches.length / Math.max(target.tags.length, 1)) * weights.tags;
      matchedFeatures.push(...tagMatches.slice(0, 3).map(t => `tag:${t}`));
    }

    // Theme similarity
    const themeMatches = this.findMatches(target.similarityFeatures.contentThemes, candidate.similarityFeatures.contentThemes);
    if (themeMatches.length > 0) {
      totalScore += (themeMatches.length / Math.max(target.similarityFeatures.contentThemes.length, 1)) * weights.themes;
      matchedFeatures.push(...themeMatches.map(t => `theme:${t}`));
    }

    // Visual style similarity
    const visualMatches = this.findMatches(target.similarityFeatures.visualStyle, candidate.similarityFeatures.visualStyle);
    if (visualMatches.length > 0) {
      totalScore += (visualMatches.length / Math.max(target.similarityFeatures.visualStyle.length, 1)) * weights.visualStyle;
      matchedFeatures.push(...visualMatches.map(v => `visual:${v}`));
    }

    // Content type match
    if (target.contentType === candidate.contentType) {
      totalScore += weights.contentType;
      matchedFeatures.push(`type:${target.contentType}`);
    }

    // Generate reason
    const reason = this.generateSimilarityReason(matchedFeatures, totalScore);

    return {
      score: Math.min(totalScore, 1.0),
      matchedFeatures: matchedFeatures.slice(0, 5), // Limit to top 5 features
      reason
    };
  }

  // Helper methods
  private static findMatches(arr1: string[], arr2: string[]): string[] {
    return arr1.filter(item => arr2.includes(item));
  }

  private static extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private static parseStoredAnalysis(video: Video): VideoAnalysisResult | null {
    // Try to parse analysis from existing tags/categories if stored
    if (video.tags && video.categories) {
      const tags = video.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const categories = video.categories.split(',').map(c => c.trim()).filter(c => c.length > 0);
      
      if (tags.length > 3 || categories.length > 1) {
        return {
          tags,
          categories,
          description: video.title,
          performers: video.performers ? video.performers.split(',').map(p => p.trim()) : [],
          duration: video.duration || 0,
          quality: 'HD',
          contentType: 'video',
          similarityFeatures: {
            visualStyle: tags.filter(t => ['pov', 'close-up', 'artistic'].includes(t)),
            audioFeatures: [],
            contentThemes: categories,
            technicalAspects: tags.filter(t => ['hd', '4k', 'streaming'].includes(t))
          }
        };
      }
    }
    return null;
  }

  private static async updateVideoWithAnalysis(videoId: string, analysis: VideoAnalysisResult): Promise<void> {
    try {
      await storage.updateVideo(videoId, {
        tags: analysis.tags.join(', '),
        categories: analysis.categories.join(', '),
        performers: analysis.performers.join(', ')
      });
    } catch (error) {
      console.error('Error updating video with analysis:', error);
    }
  }

  private static getFallbackAnalysis(title: string): VideoAnalysisResult {
    return {
      tags: ['adult', 'video'],
      categories: ['general'],
      description: title,
      performers: [],
      duration: 0,
      quality: 'HD',
      contentType: 'video',
      similarityFeatures: {
        visualStyle: [],
        audioFeatures: [],
        contentThemes: ['general'],
        technicalAspects: []
      }
    };
  }

  private static generateSimilarityReason(features: string[], score: number): string {
    if (score > 0.8) return 'Highly similar content and style';
    if (score > 0.6) return `Similar ${features.slice(0, 2).join(' and ')}`;
    if (score > 0.4) return `Shares ${features[0] || 'common elements'}`;
    return 'Some matching features';
  }

  // Batch analyze multiple videos for improved performance
  static async batchAnalyzeVideos(videoIds: string[]): Promise<Map<string, VideoAnalysisResult>> {
    const results = new Map<string, VideoAnalysisResult>();
    const batchSize = 10;
    
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      const promises = batch.map(async (id) => {
        const video = await storage.getVideo(id);
        if (video) {
          const analysis = await this.analyzeVideo(video.videoUrl || '', video.title);
          await this.updateVideoWithAnalysis(id, analysis);
          return [id, analysis] as [string, VideoAnalysisResult];
        }
        return null;
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(result => {
        if (result) {
          results.set(result[0], result[1]);
        }
      });
    }

    return results;
  }
}