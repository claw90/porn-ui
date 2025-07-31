import puppeteer from 'puppeteer';
import { db } from '../db';
import { videos, videoViews, userPreferences } from '@shared/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

interface VideoSearchResult {
  url: string;
  title: string;
  description?: string;
  duration?: string;
  platform: string;
  thumbnail?: string;
  confidence: number;
  category: string;
  reasoning: string;
}

interface UserWatchingProfile {
  preferredCategories: string[];
  favoritePerformers: string[];
  watchingPatterns: {
    timeOfDay: string[];
    sessionLength: number;
    preferredDuration: string;
  };
  contentPreferences: {
    themes: string[];
    styles: string[];
    intensity: number;
  };
}

export class InternetVideoDiscoveryService {
  private searchEngines = [
    'thisvid.com',
    'pornhub.com',
    'xvideos.com',
    'redtube.com',
    'tube8.com',
    'spankbang.com',
    'xhamster.com',
    'beeg.com',
    'youporn.com',
    'tnaflix.com'
  ];

  async generateUserProfile(userId: string): Promise<UserWatchingProfile> {
    try {
      // Get recent viewing history
      const recentViews = await db
        .select({
          videoId: videoViews.videoId,
          watchDuration: videoViews.watchDuration,
          completionPercentage: videoViews.completionPercentage,
          timestamp: videoViews.timestamp
        })
        .from(videoViews)
        .where(eq(videoViews.userId, userId))
        .orderBy(desc(videoViews.timestamp))
        .limit(100);

      // Get user preferences
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));

      // Get watched videos with metadata
      const watchedVideos = await db
        .select({
          id: videos.id,
          title: videos.title,
          videoUrl: videos.videoUrl,
          tags: videos.tags,
          category: videos.category
        })
        .from(videos)
        .where(sql`${videos.id} IN (${sql.join(recentViews.map(v => sql`${v.videoId}`), sql`, `)})`)
        .limit(50);

      // Analyze patterns
      const profile = this.analyzeWatchingPatterns(watchedVideos, recentViews, preferences);
      return profile;
    } catch (error) {
      console.error('Error generating user profile:', error);
      return this.getDefaultProfile();
    }
  }

  private analyzeWatchingPatterns(videos: any[], views: any[], preferences: any): UserWatchingProfile {
    const categories = new Map<string, number>();
    const themes = new Set<string>();
    const performers = new Set<string>();

    // Analyze video metadata
    videos.forEach(video => {
      if (video.category) {
        categories.set(video.category, (categories.get(video.category) || 0) + 1);
      }
      
      if (video.tags) {
        const tags = Array.isArray(video.tags) ? video.tags : [video.tags];
        tags.forEach((tag: string) => {
          if (tag.toLowerCase().includes('twink') || 
              tag.toLowerCase().includes('muscle') ||
              tag.toLowerCase().includes('bear') ||
              tag.toLowerCase().includes('daddy') ||
              tag.toLowerCase().includes('young') ||
              tag.toLowerCase().includes('amateur') ||
              tag.toLowerCase().includes('bareback')) {
            themes.add(tag.toLowerCase());
          }
        });
      }

      // Extract potential performer names from titles
      const titleWords = video.title.toLowerCase().split(/[\s\-_]+/);
      titleWords.forEach(word => {
        if (word.length > 2 && word.length < 15 && /^[a-zA-Z]+$/.test(word)) {
          performers.add(word);
        }
      });
    });

    // Analyze viewing behavior
    const avgWatchDuration = views.reduce((acc, view) => acc + (view.watchDuration || 0), 0) / views.length;
    const avgCompletion = views.reduce((acc, view) => acc + (view.completionPercentage || 0), 0) / views.length;

    return {
      preferredCategories: Array.from(categories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category]) => category),
      favoritePerformers: Array.from(performers).slice(0, 10),
      watchingPatterns: {
        timeOfDay: this.analyzeTimePatterns(views),
        sessionLength: avgWatchDuration || 300,
        preferredDuration: avgCompletion > 0.7 ? 'long' : avgCompletion > 0.4 ? 'medium' : 'short'
      },
      contentPreferences: {
        themes: Array.from(themes).slice(0, 8),
        styles: this.inferStyles(categories),
        intensity: preferences?.contentIntensity || 5
      }
    };
  }

  private analyzeTimePatterns(views: any[]): string[] {
    const hours = views.map(view => new Date(view.timestamp).getHours());
    const patterns = new Map<string, number>();
    
    hours.forEach(hour => {
      let period = 'morning';
      if (hour >= 12 && hour < 17) period = 'afternoon';
      else if (hour >= 17 && hour < 22) period = 'evening';
      else if (hour >= 22 || hour < 6) period = 'night';
      
      patterns.set(period, (patterns.get(period) || 0) + 1);
    });

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([period]) => period);
  }

  private inferStyles(categories: Map<string, number>): string[] {
    const styles = [];
    
    // Infer styles from popular categories
    if (categories.has('amateur')) styles.push('authentic', 'realistic');
    if (categories.has('hd')) styles.push('high-quality', 'professional');
    if (categories.has('compilation')) styles.push('variety', 'highlights');
    
    return styles.slice(0, 4);
  }

  private getDefaultProfile(): UserWatchingProfile {
    return {
      preferredCategories: ['gay', 'amateur', 'hd', 'twink', 'muscle'],
      favoritePerformers: [],
      watchingPatterns: {
        timeOfDay: ['evening', 'night'],
        sessionLength: 300,
        preferredDuration: 'medium'
      },
      contentPreferences: {
        themes: ['bareback', 'amateur', 'young', 'muscle'],
        styles: ['authentic', 'high-quality'],
        intensity: 5
      }
    };
  }

  async searchInternetForVideos(profile: UserWatchingProfile, maxResults: number = 20): Promise<VideoSearchResult[]> {
    const results: VideoSearchResult[] = [];
    
    try {
      console.log('Starting internet video discovery...');
      
      // Generate search queries based on user profile
      const searchQueries = this.generateSearchQueries(profile);
      
      // Search each platform
      for (const platform of this.searchEngines.slice(0, 5)) { // Limit to top 5 platforms
        try {
          const platformResults = await this.searchPlatform(platform, searchQueries, Math.ceil(maxResults / 5));
          results.push(...platformResults);
        } catch (error) {
          console.error(`Error searching ${platform}:`, error);
        }
      }

      // Sort by confidence and remove duplicates
      const uniqueResults = this.removeDuplicates(results);
      return uniqueResults
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxResults);

    } catch (error) {
      console.error('Error in internet video discovery:', error);
      return [];
    }
  }

  private generateSearchQueries(profile: UserWatchingProfile): string[] {
    const queries = [];
    
    // Category-based queries
    profile.preferredCategories.forEach(category => {
      queries.push(`gay ${category}`);
      queries.push(`${category} HD`);
    });

    // Theme-based queries
    profile.contentPreferences.themes.forEach(theme => {
      queries.push(`gay ${theme}`);
      queries.push(`${theme} amateur`);
    });

    // Performer-based queries
    profile.favoritePerformers.slice(0, 3).forEach(performer => {
      queries.push(`gay ${performer}`);
    });

    // Trending queries
    queries.push('gay trending', 'gay new', 'gay hot', 'gay popular');

    return queries.slice(0, 15); // Limit number of queries
  }

  private async searchPlatform(platform: string, queries: string[], maxResults: number): Promise<VideoSearchResult[]> {
    const results: VideoSearchResult[] = [];
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      for (const query of queries.slice(0, 3)) { // Limit queries per platform
        try {
          const searchUrl = this.buildSearchUrl(platform, query);
          await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 10000 });
          
          const platformResults = await this.extractVideosFromPage(page, platform, query);
          results.push(...platformResults.slice(0, Math.ceil(maxResults / 3)));
          
          // Small delay between searches
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error searching ${platform} for "${query}":`, error);
        }
      }
      
      await browser.close();
    } catch (error) {
      console.error(`Browser error for ${platform}:`, error);
    }

    return results;
  }

  private buildSearchUrl(platform: string, query: string): string {
    const encodedQuery = encodeURIComponent(query);
    
    switch (platform) {
      case 'thisvid.com':
        return `https://www.thisvid.com/search/${encodedQuery}/`;
      case 'pornhub.com':
        return `https://www.pornhub.com/video/search?search=${encodedQuery}`;
      case 'xvideos.com':
        return `https://www.xvideos.com/?k=${encodedQuery}`;
      case 'redtube.com':
        return `https://www.redtube.com/?search=${encodedQuery}`;
      case 'xhamster.com':
        return `https://xhamster.com/search/${encodedQuery}`;
      default:
        return `https://${platform}/search?q=${encodedQuery}`;
    }
  }

  private async extractVideosFromPage(page: any, platform: string, query: string): Promise<VideoSearchResult[]> {
    try {
      // Wait for content to load
      await page.waitForSelector('a[href*="video"], a[href*="/v/"], .video-item, .thumb', { timeout: 5000 });
      
      const videos = await page.evaluate((platform: string, query: string) => {
        const results: any[] = [];
        
        // Platform-specific selectors
        let videoSelectors: string[] = [];
        let titleSelector = '';
        let linkSelector = '';
        let durationSelector = '';
        
        switch (platform) {
          case 'thisvid.com':
            videoSelectors = ['.item', '.video-item'];
            titleSelector = '.title, h3 a, .video-title';
            linkSelector = 'a[href*="/videos/"]';
            break;
          case 'pornhub.com':
            videoSelectors = ['.wrap', '.videoblock'];
            titleSelector = '.title a, .thumbnail-info-wrapper a';
            linkSelector = 'a[href*="/view_video.php"]';
            break;
          case 'xvideos.com':
            videoSelectors = ['.thumb', '.mozaique'];
            titleSelector = '.title a, p.title a';
            linkSelector = 'a[href*="/video"]';
            break;
          default:
            videoSelectors = ['.video', '.thumb', '.item', '[class*="video"]'];
            titleSelector = 'a[title], .title, h3, h4';
            linkSelector = 'a[href*="video"], a[href*="/v/"]';
        }

        // Extract videos
        const videoElements = document.querySelectorAll(videoSelectors.join(', '));
        
        Array.from(videoElements).slice(0, 10).forEach((element: any) => {
          try {
            const titleEl = element.querySelector(titleSelector);
            const linkEl = element.querySelector(linkSelector);
            const durationEl = element.querySelector('.duration, .time, [class*="duration"]');
            
            if (titleEl && linkEl) {
              const title = titleEl.textContent?.trim() || titleEl.title || '';
              let url = linkEl.href || linkEl.getAttribute('href') || '';
              
              // Make URL absolute
              if (url.startsWith('/')) {
                url = `https://${platform}${url}`;
              }
              
              if (title && url && title.length > 3) {
                results.push({
                  title,
                  url,
                  duration: durationEl?.textContent?.trim() || '',
                  platform,
                  query
                });
              }
            }
          } catch (error) {
            console.error('Error extracting video:', error);
          }
        });
        
        return results;
      }, platform, query);

      // Process and score results
      return videos.map(video => ({
        ...video,
        confidence: this.calculateRecommendationScore(video, query),
        category: this.inferCategory(video.title),
        reasoning: this.generateReasoning(video, query)
      }));

    } catch (error) {
      console.error(`Error extracting videos from ${platform}:`, error);
      return [];
    }
  }

  private calculateRecommendationScore(video: any, query: string): number {
    let score = 0.5; // Base score
    
    const title = video.title.toLowerCase();
    const queryTerms = query.toLowerCase().split(' ');
    
    // Boost for query term matches
    queryTerms.forEach(term => {
      if (title.includes(term)) score += 0.15;
    });
    
    // Boost for quality indicators
    if (title.includes('hd') || title.includes('4k')) score += 0.1;
    if (title.includes('amateur')) score += 0.1;
    if (title.includes('new') || title.includes('latest')) score += 0.05;
    
    // Boost for gay content indicators
    if (title.includes('gay') || title.includes('twink') || title.includes('muscle')) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  private inferCategory(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('twink')) return 'twink';
    if (titleLower.includes('muscle') || titleLower.includes('stud')) return 'muscle';
    if (titleLower.includes('bear') || titleLower.includes('daddy')) return 'bear';
    if (titleLower.includes('amateur')) return 'amateur';
    if (titleLower.includes('bareback')) return 'bareback';
    if (titleLower.includes('compilation')) return 'compilation';
    
    return 'gay';
  }

  private generateReasoning(video: any, query: string): string {
    const reasons = [];
    
    if (video.title.toLowerCase().includes(query.toLowerCase())) {
      reasons.push(`Matches your search for "${query}"`);
    }
    
    if (video.title.toLowerCase().includes('hd')) {
      reasons.push('High quality video');
    }
    
    if (video.title.toLowerCase().includes('amateur')) {
      reasons.push('Authentic amateur content');
    }
    
    if (video.platform === 'thisvid.com') {
      reasons.push('From premium platform');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Recommended based on your preferences';
  }

  private removeDuplicates(results: VideoSearchResult[]): VideoSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      // Create a simple hash from title and platform
      const hash = `${result.title.toLowerCase().substring(0, 30)}-${result.platform}`;
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    });
  }

  async addDiscoveredVideoToLibrary(videoResult: VideoSearchResult, userId: string): Promise<boolean> {
    try {
      // Check if already exists
      const [existing] = await db
        .select()
        .from(videos)
        .where(eq(videos.videoUrl, videoResult.url));

      if (existing) {
        console.log('Video already exists in library');
        return false;
      }

      // Add to library
      await db.insert(videos).values({
        title: videoResult.title,
        videoUrl: videoResult.url,
        isExternal: true,
        tags: [videoResult.category],
        category: videoResult.category,
        userId: userId,
        metadata: JSON.stringify({
          platform: videoResult.platform,
          confidence: videoResult.confidence,
          reasoning: videoResult.reasoning,
          discoveredAt: new Date().toISOString()
        })
      });

      console.log(`Added discovered video: ${videoResult.title}`);
      return true;
    } catch (error) {
      console.error('Error adding discovered video:', error);
      return false;
    }
  }
}

export const internetVideoDiscovery = new InternetVideoDiscoveryService();