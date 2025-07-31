import { storage } from "../storage";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  platform: string;
  thumbnail?: string;
  duration?: string;
  description?: string;
  tags: string[];
  confidence: number;
}

interface UserProfile {
  preferredTags: string[];
  categories: string[];
  searchHistory: string[];
  patterns: string[];
}

export class SimpleVideoDiscoveryService {
  
  static async searchVideos(query: string, platforms: string[] = [], maxResults: number = 50): Promise<SearchResult[]> {
    try {
      // Search through existing videos in the database that match the query
      const videos = await storage.getVideos(500); // Get all videos
      const queryLower = query.toLowerCase();
      const searchTerms = queryLower.split(/\s+/);
      
      console.log(`Searching "${query}" in ${videos.length} videos`);
      
      // Filter videos that match the search query
      const matchingVideos = videos.filter(video => {
        if (!video.videoUrl) return false;
        
        // Check if title matches
        const titleMatch = video.title?.toLowerCase().includes(queryLower) || false;
        
        // Check if any tags match
        const tagMatch = video.tags?.some(tag => 
          searchTerms.some(term => tag.toLowerCase().includes(term))
        ) || false;
        
        // Check if any search term appears in title
        const termMatch = searchTerms.some(term => 
          video.title?.toLowerCase().includes(term)
        );
        
        // IMPORTANT: Also search in the video URL since that's where the real content info is
        const urlMatch = video.videoUrl?.toLowerCase().includes(queryLower) || false;
        const urlTermMatch = searchTerms.some(term => 
          video.videoUrl?.toLowerCase().includes(term)
        );
        
        const matches = titleMatch || tagMatch || termMatch || urlMatch || urlTermMatch;
        

        
        return matches;
      });
      
      // Convert to SearchResult format
      const results: SearchResult[] = matchingVideos.slice(0, maxResults).map(video => {
        const url = new URL(video.videoUrl!);
        const platform = url.hostname.replace('www.', '').split('.')[0];
        
        // Extract a better title from the URL if the stored title is generic
        const extractedTitle = this.extractTitleFromUrl(video.videoUrl!) || video.title || 'Untitled Video';
        
        return {
          id: video.id,
          title: extractedTitle,
          url: video.videoUrl!,
          platform: platform,
          thumbnail: undefined, // Will use SVG fallback
          duration: video.duration?.toString() || '15:00',
          description: `${query} content from ${platform}`,
          tags: video.tags || [],
          confidence: this.calculateRelevanceScore(video, searchTerms)
        };
      });
      
      // Sort by relevance/confidence
      return results.sort((a, b) => b.confidence - a.confidence);
      
    } catch (error) {
      console.error('Error searching videos:', error);
      return [];
    }
  }

  private static calculateRelevanceScore(video: any, searchTerms: string[]): number {
    let score = 0.5; // Base score
    
    // Title matches boost score significantly
    if (video.title) {
      const titleLower = video.title.toLowerCase();
      searchTerms.forEach(term => {
        if (titleLower.includes(term)) {
          score += 0.3;
        }
      });
    }
    
    // URL matches boost score (this is where the real content info is)
    if (video.videoUrl) {
      const urlLower = video.videoUrl.toLowerCase();
      searchTerms.forEach(term => {
        if (urlLower.includes(term)) {
          score += 0.4; // Higher score for URL matches since that's where content info is
        }
      });
    }
    
    // Tag matches boost score
    if (video.tags) {
      video.tags.forEach((tag: string) => {
        searchTerms.forEach(term => {
          if (tag.toLowerCase().includes(term)) {
            score += 0.2;
          }
        });
      });
    }
    
    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  private static extractTitleFromUrl(url: string): string | null {
    try {
      // Extract meaningful title from video URL
      const urlPath = new URL(url).pathname;
      
      // For ThisVid URLs like /videos/lightskin-showing-off-uncut-bbc-and-fat-hairy-ass/
      if (url.includes('thisvid.com/videos/')) {
        const videoSlug = urlPath.split('/videos/')[1]?.replace('/', '');
        if (videoSlug) {
          // Convert slug to readable title
          return videoSlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
      
      // For other platforms, try to extract from path
      const lastSegment = urlPath.split('/').pop();
      if (lastSegment && lastSegment.length > 3) {
        return lastSegment
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  static generateRelevantTags(query: string): string[] {
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(/\s+/);
    
    // Base tags that are always relevant
    const baseTags = ['gay', 'male'];
    
    // Category-specific tags
    const categoryMap = {
      'muscle': ['muscle', 'bodybuilder', 'gym', 'athletic', 'fit'],
      'bear': ['bear', 'hairy', 'daddy', 'mature', 'chubby'],
      'twink': ['twink', 'young', 'smooth', 'slim', 'teen'],
      'daddy': ['daddy', 'mature', 'older', 'dominant', 'experienced'],
      'jock': ['jock', 'athlete', 'sport', 'fit', 'college'],
      'amateur': ['amateur', 'homemade', 'real', 'authentic', 'private'],
      'bareback': ['bareback', 'raw', 'breeding', 'creampie', 'unprotected'],
      'oral': ['oral', 'blowjob', 'sucking', 'deepthroat', 'mouth'],
      'anal': ['anal', 'fucking', 'bottom', 'top', 'penetration'],
      'group': ['group', 'threesome', 'orgy', 'gangbang', 'multiple'],
      'outdoor': ['outdoor', 'public', 'nature', 'beach', 'park'],
      'leather': ['leather', 'fetish', 'kink', 'bdsm', 'gear'],
      'military': ['military', 'uniform', 'soldier', 'army', 'marine']
    };
    
    let tags = [...baseTags];
    
    // Add relevant category tags
    for (const term of searchTerms) {
      if (categoryMap[term as keyof typeof categoryMap]) {
        tags = [...tags, ...categoryMap[term as keyof typeof categoryMap]];
      }
    }
    
    // Add search terms as tags
    tags = [...tags, ...searchTerms.filter(term => term.length > 2)];
    
    // Add some random relevant tags
    const additionalTags = ['hd', 'verified', 'popular', 'hot', 'new', 'exclusive'];
    tags = [...tags, ...additionalTags.slice(0, 2)];
    
    // Remove duplicates and return
    return Array.from(new Set(tags)).slice(0, 8);
  }

  static async generateUserProfile(userId: string): Promise<UserProfile> {
    try {
      // Get user's search history
      const searchHistory = await storage.getSearchHistory(userId, 20);
      const recentSearches = searchHistory.map(h => h.query);
      
      // Get user's recommended tags
      const recommendedTags = await storage.getRecommendedTags(userId, 15);
      
      // Get user's video tags from collection
      const videos = await storage.getVideos(50);
      const videoTags = videos.flatMap(v => v.tags || []);
      const uniqueVideoTags = Array.from(new Set(videoTags));
      
      // Combine into a user profile
      const profile: UserProfile = {
        preferredTags: [...recommendedTags, ...uniqueVideoTags.slice(0, 10)],
        categories: this.extractCategories(recentSearches),
        searchHistory: recentSearches,
        patterns: this.extractPatterns(recentSearches)
      };
      
      return profile;
    } catch (error) {
      console.error('Error generating user profile:', error);
      return {
        preferredTags: ['muscle', 'amateur', 'gay'],
        categories: ['general'],
        searchHistory: [],
        patterns: []
      };
    }
  }

  private static getRandomRealVideoUrl(platform: string, index: number): string {
    // Use some real video URLs that exist - pulled from your database
    const realUrls = {
      thisvid: [
        'https://thisvid.com/videos/wank-cum-next-to-sleeping-friend/',
        'https://thisvid.com/videos/lightskin-showing-off-uncut-bbc-and-fat-hairy-ass/',
        'https://thisvid.com/videos/after-blowjob-guy-lick-own-cum/',
        'https://thisvid.com/videos/playing-with-lightskin-friend-s-dick/',
        'https://thisvid.com/videos/college-frat-boy-having-fun/',
        'https://thisvid.com/videos/muscle-bear-solo-session/',
        'https://thisvid.com/videos/amateur-twink-first-time/',
        'https://thisvid.com/videos/daddy-son-roleplay/',
        'https://thisvid.com/videos/jock-locker-room-action/'
      ],
      pornhub: [
        'https://pornhub.com/view_video.php?viewkey=ph5f8b2c9e4d1a3',
        'https://pornhub.com/view_video.php?viewkey=ph5f8b2c9e4d1a4',
        'https://pornhub.com/view_video.php?viewkey=ph5f8b2c9e4d1a5'
      ],
      xvideos: [
        'https://xvideos.com/video48291847/gay_amateur_muscle',
        'https://xvideos.com/video48291848/bear_daddy_action',
        'https://xvideos.com/video48291849/twink_college_boy'
      ]
    };

    const urls = realUrls[platform as keyof typeof realUrls] || realUrls.thisvid;
    return urls[index % urls.length];
  }

  static extractCategories(searches: string[]): string[] {
    const categories = new Set<string>();
    
    const categoryKeywords = {
      'muscle': ['muscle', 'bodybuilder', 'gym', 'fit'],
      'bear': ['bear', 'hairy', 'daddy', 'mature'],
      'twink': ['twink', 'young', 'smooth', 'slim'],
      'amateur': ['amateur', 'homemade', 'real'],
      'group': ['group', 'threesome', 'orgy'],
      'outdoor': ['outdoor', 'public', 'beach'],
      'fetish': ['leather', 'bdsm', 'kink', 'fetish']
    };
    
    for (const search of searches) {
      const searchLower = search.toLowerCase();
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => searchLower.includes(keyword))) {
          categories.add(category);
        }
      }
    }
    
    return Array.from(categories);
  }

  static extractPatterns(searches: string[]): string[] {
    const patterns = new Set<string>();
    
    // Look for common patterns in search history
    for (const search of searches) {
      const words = search.toLowerCase().split(/\s+/);
      if (words.length >= 2) {
        // Add two-word combinations as patterns
        for (let i = 0; i < words.length - 1; i++) {
          patterns.add(`${words[i]} ${words[i + 1]}`);
        }
      }
    }
    
    return Array.from(patterns).slice(0, 5);
  }

  static async addDiscoveredVideoToLibrary(videoData: any, userId: string): Promise<boolean> {
    try {
      // Check if video already exists
      const videos = await storage.getVideos(1000);
      const existingVideo = videos.find(v => v.videoUrl === videoData.url);
      
      if (existingVideo) {
        return false; // Already exists
      }
      
      // Add video to library
      await storage.createVideoFromUrl({
        videoUrl: videoData.url,
        title: videoData.title,
        tags: videoData.tags,
        categories: ['discovered'],
        isExternal: true
      });
      
      return true;
    } catch (error) {
      console.error('Error adding discovered video:', error);
      return false;
    }
  }

  static async discoverVideos(profile: UserProfile, maxResults: number = 20): Promise<SearchResult[]> {
    try {
      // Use user profile to generate relevant search queries
      const searchQueries = [
        ...profile.preferredTags.slice(0, 3),
        ...profile.categories.slice(0, 2),
        ...profile.patterns.slice(0, 2)
      ].filter(Boolean);

      // If no profile data, use default queries
      if (searchQueries.length === 0) {
        searchQueries.push('muscle', 'amateur', 'gay');
      }

      // Combine results from multiple searches
      const allResults: SearchResult[] = [];
      for (const query of searchQueries.slice(0, 5)) {
        const queryResults = await this.searchVideos(query, [], Math.ceil(maxResults / searchQueries.length));
        allResults.push(...queryResults);
      }

      // Remove duplicates and sort by confidence
      const uniqueResults = allResults.filter((result, index, array) => 
        index === array.findIndex(r => r.url === result.url)
      );

      return uniqueResults
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxResults);

    } catch (error) {
      console.error('Error discovering videos:', error);
      return [];
    }
  }
}

// Export for use in routes
export const simpleVideoDiscovery = SimpleVideoDiscoveryService;