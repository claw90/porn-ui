import crypto from 'crypto';
import { db } from '../db';
import { videos, duplicateLog, videoViews, type Video } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

export class DuplicateDetectionService {
  /**
   * Generate a hash for URL-based duplicate detection
   */
  static generateUrlHash(url: string): string {
    // Normalize URL by removing query parameters that don't affect content
    const normalizedUrl = this.normalizeUrl(url);
    return crypto.createHash('sha256').update(normalizedUrl).digest('hex');
  }

  /**
   * Normalize URL for consistent duplicate detection
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove tracking parameters but keep essential ones
      const allowedParams = ['v', 'id', 'watch', 'video_id'];
      const searchParams = new URLSearchParams();
      
      urlObj.searchParams.forEach((value, key) => {
        if (allowedParams.includes(key.toLowerCase())) {
          searchParams.set(key, value);
        }
      });
      
      urlObj.search = searchParams.toString();
      
      // Remove fragment and trailing slash
      urlObj.hash = '';
      let pathname = urlObj.pathname;
      if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
      }
      urlObj.pathname = pathname;
      
      return urlObj.toString().toLowerCase();
    } catch {
      // If URL parsing fails, just use the original URL
      return url.toLowerCase().trim();
    }
  }

  /**
   * Check if a URL or file is a duplicate
   */
  static async checkForDuplicate(videoUrl?: string, filePath?: string): Promise<{ 
    isDuplicate: boolean; 
    existingVideo?: Video; 
    message?: string 
  }> {
    try {
      if (videoUrl) {
        const urlHash = this.generateUrlHash(videoUrl);
        
        // Check if this URL hash already exists
        const existingVideo = await db
          .select()
          .from(videos)
          .where(eq(videos.urlHash, urlHash))
          .limit(1);

        if (existingVideo.length > 0) {
          // Log the duplicate attempt
          await db.insert(duplicateLog).values({
            originalVideoId: existingVideo[0].id,
            duplicateUrl: videoUrl,
            urlHash: urlHash,
            blocked: true
          });

          return {
            isDuplicate: true,
            existingVideo: existingVideo[0],
            message: `This video URL was already added on ${existingVideo[0].createdAt?.toLocaleDateString()}`
          };
        }
      }

      if (filePath) {
        // For file-based videos, check by file path or original name
        const existingVideo = await db
          .select()
          .from(videos)
          .where(eq(videos.filePath, filePath))
          .limit(1);

        if (existingVideo.length > 0) {
          return {
            isDuplicate: true,
            existingVideo: existingVideo[0],
            message: `This file was already uploaded on ${existingVideo[0].createdAt?.toLocaleDateString()}`
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Log a video view
   */
  static async logVideoView(videoId: string, duration?: number, completed: boolean = false, userAgent?: string, ipAddress?: string): Promise<void> {
    try {
      // Insert view record
      await db.insert(videoViews).values({
        videoId,
        duration,
        completed,
        userAgent,
        ipAddress
      });

      // Update video view count and last viewed timestamp
      await db
        .update(videos)
        .set({ 
          viewCount: (await this.getVideoViewCount(videoId)),
          lastViewed: new Date()
        })
        .where(eq(videos.id, videoId));

    } catch (error) {
      console.error('Error logging video view:', error);
    }
  }

  /**
   * Get total view count for a video
   */
  static async getVideoViewCount(videoId: string): Promise<number> {
    try {
      const views = await db
        .select()
        .from(videoViews)
        .where(eq(videoViews.videoId, videoId));
      
      return views.length;
    } catch (error) {
      console.error('Error getting view count:', error);
      return 0;
    }
  }

  /**
   * Check if user has watched this video before
   */
  static async hasWatchedBefore(videoId: string, userId: string = 'demo-user'): Promise<{
    hasWatched: boolean;
    lastWatched?: Date;
    viewCount: number;
    completed: boolean;
  }> {
    try {
      const views = await db
        .select()
        .from(videoViews)
        .where(eq(videoViews.videoId, videoId))
        .orderBy(desc(videoViews.viewedAt));

      const hasWatched = views.length > 0;
      const lastWatched = hasWatched ? views[0].viewedAt : undefined;
      const completed = views.some(v => v.completed);

      return {
        hasWatched,
        lastWatched: lastWatched || undefined,
        viewCount: views.length,
        completed
      };
    } catch (error) {
      console.error('Error checking watch history:', error);
      return { hasWatched: false, viewCount: 0, completed: false };
    }
  }

  /**
   * Get duplicate log entries
   */
  static async getDuplicateLog(limit: number = 50): Promise<any[]> {
    try {
      return await db
        .select({
          id: duplicateLog.id,
          duplicateUrl: duplicateLog.duplicateUrl,
          attemptedAt: duplicateLog.attemptedAt,
          blocked: duplicateLog.blocked,
          originalVideo: {
            id: videos.id,
            title: videos.title,
            createdAt: videos.createdAt
          }
        })
        .from(duplicateLog)
        .leftJoin(videos, eq(duplicateLog.originalVideoId, videos.id))
        .orderBy(desc(duplicateLog.attemptedAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting duplicate log:', error);
      return [];
    }
  }

  /**
   * Get user's viewing history
   */
  static async getViewingHistory(userId: string = 'demo-user', limit: number = 50): Promise<any[]> {
    try {
      return await db
        .select({
          id: videoViews.id,
          viewedAt: videoViews.viewedAt,
          duration: videoViews.duration,
          completed: videoViews.completed,
          video: {
            id: videos.id,
            title: videos.title,
            videoUrl: videos.videoUrl,
            thumbnailPath: videos.thumbnailPath,
            isExternal: videos.isExternal
          }
        })
        .from(videoViews)
        .leftJoin(videos, eq(videoViews.videoId, videos.id))
        .orderBy(desc(videoViews.viewedAt))
        .limit(limit);
    } catch (error) {
      console.error('Error getting viewing history:', error);
      return [];
    }
  }
}