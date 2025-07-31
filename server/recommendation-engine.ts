import { db } from "./db";
import { 
  videos, viewHistory, recommendations, users,
  type Video, type ViewHistory, type User, type Recommendation
} from "@shared/schema";
import { eq, desc, and, not, inArray, sql, gt, lt } from "drizzle-orm";

export interface RecommendationOptions {
  userId: string;
  limit?: number;
  excludeWatched?: boolean;
  algorithm?: 'collaborative' | 'content' | 'hybrid' | 'trending';
}

export interface VideoRecommendation extends Video {
  score: number;
  reason: string;
  algorithm: string;
}

export class RecommendationEngine {
  
  /**
   * Generate personalized video recommendations
   */
  async generateRecommendations(options: RecommendationOptions): Promise<VideoRecommendation[]> {
    const { userId, limit = 10, excludeWatched = true, algorithm = 'hybrid' } = options;
    
    try {
      // Get user preferences and history
      const user = await this.getUserProfile(userId);
      if (!user) return [];

      let recommendations: VideoRecommendation[] = [];

      switch (algorithm) {
        case 'collaborative':
          recommendations = await this.collaborativeFiltering(userId, limit);
          break;
        case 'content':
          recommendations = await this.contentBasedFiltering(user, limit);
          break;
        case 'trending':
          recommendations = await this.trendingRecommendations(user, limit);
          break;
        case 'hybrid':
        default:
          recommendations = await this.hybridRecommendations(userId, user, limit);
          break;
      }

      // Apply user filters and exclusions
      recommendations = await this.applyUserFilters(recommendations, user, excludeWatched);

      // Cache recommendations
      await this.cacheRecommendations(userId, recommendations);

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Collaborative filtering based on similar users
   */
  private async collaborativeFiltering(userId: string, limit: number): Promise<VideoRecommendation[]> {
    // Find users with similar viewing patterns
    const userHistory = await db
      .select()
      .from(viewHistory)
      .where(eq(viewHistory.userId, userId));

    if (userHistory.length === 0) {
      return this.popularRecommendations(limit);
    }

    // Get videos watched by current user
    const watchedVideoIds = userHistory.map(h => h.videoId);

    // Find similar users based on overlapping views and ratings
    const similarUsers = await db
      .select({
        userId: viewHistory.userId,
        similarity: sql<number>`
          COUNT(*) as shared_views,
          AVG(ABS(${viewHistory.rating} - user_ratings.rating)) as rating_diff
        `
      })
      .from(viewHistory)
      .innerJoin(
        sql`(
          SELECT video_id, rating, user_id 
          FROM view_history 
          WHERE user_id = ${userId} AND rating IS NOT NULL
        ) as user_ratings`,
        sql`${viewHistory.videoId} = user_ratings.video_id`
      )
      .where(
        and(
          not(eq(viewHistory.userId, userId)),
          inArray(viewHistory.videoId, watchedVideoIds)
        )
      )
      .groupBy(viewHistory.userId)
      .having(sql`COUNT(*) >= 2`) // At least 2 shared videos
      .orderBy(sql`shared_views DESC, rating_diff ASC`)
      .limit(10);

    if (similarUsers.length === 0) {
      return this.contentBasedFromHistory(userId, limit);
    }

    // Get highly rated videos from similar users
    const similarUserIds = similarUsers.map(u => u.userId);
    
    const recommendations = await db
      .select()
      .from(videos)
      .innerJoin(viewHistory, eq(videos.id, viewHistory.videoId))
      .where(
        and(
          inArray(viewHistory.userId, similarUserIds),
          not(inArray(videos.id, watchedVideoIds)),
          gt(viewHistory.rating, 3), // Good ratings only
          gt(viewHistory.completionPercentage, 70) // Well-watched videos
        )
      )
      .groupBy(videos.id)
      .orderBy(sql`AVG(${viewHistory.rating}) DESC, COUNT(*) DESC`)
      .limit(limit);

    return recommendations.map(rec => ({
      ...rec.videos,
      score: 0.8,
      reason: "Users with similar tastes also enjoyed this",
      algorithm: "collaborative"
    }));
  }

  /**
   * Content-based filtering using video attributes
   */
  private async contentBasedFiltering(user: User, limit: number): Promise<VideoRecommendation[]> {
    const conditions = [];
    
    // Filter by user preferences
    if (user.preferredTags && user.preferredTags.length > 0) {
      conditions.push(sql`${videos.tags} && ${JSON.stringify(user.preferredTags)}`);
    }
    
    if (user.preferredPerformers && user.preferredPerformers.length > 0) {
      conditions.push(sql`${videos.performers} && ${JSON.stringify(user.preferredPerformers)}`);
    }
    
    if (user.preferredCategories && user.preferredCategories.length > 0) {
      conditions.push(sql`${videos.categories} && ${JSON.stringify(user.preferredCategories)}`);
    }

    // Apply rating filter
    if (user.minRating && user.minRating > 0) {
      conditions.push(sql`${videos.rating} > ${user.minRating}`);
    }

    // Apply duration filters
    if (user.maxDuration && user.maxDuration > 0) {
      conditions.push(sql`${videos.duration} < ${user.maxDuration}`);
    }
    if (user.minDuration && user.minDuration > 0) {
      conditions.push(sql`${videos.duration} > ${user.minDuration}`);
    }

    // Exclude blocked content
    if (user.blockedTags && user.blockedTags.length > 0) {
      conditions.push(sql`NOT ${videos.tags} && ${JSON.stringify(user.blockedTags)}`);
    }
    if (user.blockedPerformers && user.blockedPerformers.length > 0) {
      conditions.push(sql`NOT ${videos.performers} && ${JSON.stringify(user.blockedPerformers)}`);
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
    
    const contentRecommendations = await db
      .select()
      .from(videos)
      .where(whereCondition)
      .orderBy(desc(videos.rating), desc(videos.viewCount))
      .limit(limit);

    return contentRecommendations.map(video => ({
      ...video,
      score: this.calculateContentScore(video, user),
      reason: this.generateContentReason(video, user),
      algorithm: "content"
    }));
  }

  /**
   * Trending recommendations based on recent popularity
   */
  private async trendingRecommendations(user: User, limit: number): Promise<VideoRecommendation[]> {
    // Get videos trending in the last 7 days
    const recentlyPopular = await db
      .select()
      .from(videos)
      .leftJoin(viewHistory, eq(videos.id, viewHistory.videoId))
      .where(
        and(
          gt(viewHistory.viewedAt, sql`NOW() - INTERVAL '7 days'`),
          sql`${videos.rating} > ${user.minRating || 0}`
        )
      )
      .groupBy(videos.id)
      .having(sql`COUNT(view_history.id) >= 3`) // At least 3 recent views
      .orderBy(sql`COUNT(view_history.id) DESC, AVG(view_history.rating) DESC`)
      .limit(limit);

    return recentlyPopular.map(row => ({
      ...row.videos,
      score: 0.7,
      reason: "Trending content with recent popularity",
      algorithm: "trending"
    }));
  }

  /**
   * Hybrid approach combining multiple algorithms
   */
  private async hybridRecommendations(userId: string, user: User, limit: number): Promise<VideoRecommendation[]> {
    const hybridLimit = Math.ceil(limit * 1.5); // Get more to blend
    
    // Get recommendations from each algorithm
    const [collaborative, content, trending] = await Promise.all([
      this.collaborativeFiltering(userId, Math.ceil(hybridLimit * 0.4)),
      this.contentBasedFiltering(user, Math.ceil(hybridLimit * 0.4)),
      this.trendingRecommendations(user, Math.ceil(hybridLimit * 0.2))
    ]);

    // Blend recommendations with different weights
    const blended = new Map<string, VideoRecommendation>();
    
    // Add collaborative (40% weight)
    collaborative.forEach(rec => {
      blended.set(rec.id, { ...rec, score: rec.score * 0.4 });
    });
    
    // Add content-based (40% weight)
    content.forEach(rec => {
      const existing = blended.get(rec.id);
      if (existing) {
        existing.score += rec.score * 0.4;
        existing.reason += ` & ${rec.reason}`;
        existing.algorithm = "hybrid";
      } else {
        blended.set(rec.id, { ...rec, score: rec.score * 0.4, algorithm: "hybrid" });
      }
    });
    
    // Add trending (20% weight)
    trending.forEach(rec => {
      const existing = blended.get(rec.id);
      if (existing) {
        existing.score += rec.score * 0.2;
        existing.reason += ` & ${rec.reason}`;
        existing.algorithm = "hybrid";
      } else {
        blended.set(rec.id, { ...rec, score: rec.score * 0.2, algorithm: "hybrid" });
      }
    });

    // Sort by combined score
    return Array.from(blended.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get popular videos when no user data available
   */
  private async popularRecommendations(limit: number): Promise<VideoRecommendation[]> {
    const popular = await db
      .select()
      .from(videos)
      .where(gt(videos.viewCount, 0))
      .orderBy(desc(videos.viewCount), desc(videos.rating))
      .limit(limit);

    return popular.map(video => ({
      ...video,
      score: 0.5,
      reason: "Popular among all users",
      algorithm: "popular"
    }));
  }

  /**
   * Content-based recommendations from user's viewing history
   */
  private async contentBasedFromHistory(userId: string, limit: number): Promise<VideoRecommendation[]> {
    // Get user's highly rated videos
    const likedVideos = await db
      .select()
      .from(videos)
      .innerJoin(viewHistory, eq(videos.id, viewHistory.videoId))
      .where(
        and(
          eq(viewHistory.userId, userId),
          gt(viewHistory.rating, 3)
        )
      );

    if (likedVideos.length === 0) {
      return this.popularRecommendations(limit);
    }

    // Extract tags, performers, categories from liked videos
    const likedTags = new Set<string>();
    const likedPerformers = new Set<string>();
    const likedCategories = new Set<string>();

    likedVideos.forEach(({ videos: video }) => {
      video.tags?.forEach(tag => likedTags.add(tag));
      video.performers?.forEach(performer => likedPerformers.add(performer));
      video.categories?.forEach(category => likedCategories.add(category));
    });

    // Find similar videos
    const watchedIds = likedVideos.map(lv => lv.videos.id);
    
    const similar = await db
      .select()
      .from(videos)
      .where(
        and(
          not(inArray(videos.id, watchedIds)),
          sql`(
            ${videos.tags} && ${JSON.stringify(Array.from(likedTags))} OR
            ${videos.performers} && ${JSON.stringify(Array.from(likedPerformers))} OR
            ${videos.categories} && ${JSON.stringify(Array.from(likedCategories))}
          )`
        )
      )
      .orderBy(desc(videos.rating), desc(videos.viewCount))
      .limit(limit);

    return similar.map(video => ({
      ...video,
      score: 0.6,
      reason: "Similar to videos you've enjoyed",
      algorithm: "content"
    }));
  }

  /**
   * Apply user filters and exclusions
   */
  private async applyUserFilters(
    recommendations: VideoRecommendation[],
    user: User,
    excludeWatched: boolean
  ): Promise<VideoRecommendation[]> {
    let filtered = recommendations;

    if (excludeWatched) {
      const watchedVideos = await db
        .select({ videoId: viewHistory.videoId })
        .from(viewHistory)
        .where(eq(viewHistory.userId, user.id));
      
      const watchedIds = new Set(watchedVideos.map(w => w.videoId));
      filtered = filtered.filter(rec => !watchedIds.has(rec.id));
    }

    // Apply blocking filters
    if (user.blockedTags && user.blockedTags.length > 0) {
      filtered = filtered.filter(rec => 
        !rec.tags?.some(tag => user.blockedTags!.includes(tag))
      );
    }

    if (user.blockedPerformers && user.blockedPerformers.length > 0) {
      filtered = filtered.filter(rec => 
        !rec.performers?.some(performer => user.blockedPerformers!.includes(performer))
      );
    }

    return filtered;
  }

  /**
   * Cache recommendations for faster retrieval
   */
  private async cacheRecommendations(userId: string, videoRecommendations: VideoRecommendation[]): Promise<void> {
    try {
      // Clear old recommendations
      await db
        .delete(recommendations)
        .where(eq(recommendations.userId, userId));

      // Insert new recommendations
      if (videoRecommendations.length > 0) {
        await db
          .insert(recommendations)
          .values(
            videoRecommendations.map(rec => ({
              userId,
              videoId: rec.id,
              score: rec.score,
              reason: rec.reason,
              algorithm: rec.algorithm
            }))
          );
      }
    } catch (error) {
      console.error('Error caching recommendations:', error);
    }
  }

  /**
   * Get user profile with preferences
   */
  private async getUserProfile(userId: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      return user || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Calculate content-based score
   */
  private calculateContentScore(video: Video, user: User): number {
    let score = 0.5; // Base score

    // Tag matching
    if (user.preferredTags && user.preferredTags.length && video.tags && video.tags.length) {
      const tagMatches = video.tags.filter(tag => user.preferredTags!.includes(tag)).length;
      score += (tagMatches / user.preferredTags.length) * 0.3;
    }

    // Performer matching
    if (user.preferredPerformers && user.preferredPerformers.length && video.performers && video.performers.length) {
      const performerMatches = video.performers.filter(p => user.preferredPerformers!.includes(p)).length;
      score += (performerMatches / user.preferredPerformers.length) * 0.3;
    }

    // Rating boost
    if (video.rating && video.rating > 3) {
      score += (video.rating - 3) * 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate content-based recommendation reason
   */
  private generateContentReason(video: Video, user: User): string {
    const reasons = [];

    if (user.preferredTags && video.tags && user.preferredTags.some(tag => video.tags!.includes(tag))) {
      reasons.push("matches your preferred tags");
    }

    if (user.preferredPerformers && video.performers && user.preferredPerformers.some(performer => video.performers!.includes(performer))) {
      reasons.push("features your favorite performers");
    }

    if (video.rating && video.rating >= 4) {
      reasons.push("highly rated content");
    }

    return reasons.length > 0 
      ? `Recommended because it ${reasons.join(' and ')}`
      : "Matches your viewing preferences";
  }

  /**
   * Record user interaction for learning
   */
  async recordInteraction(
    userId: string,
    videoId: string,
    watchDuration: number,
    completionPercentage: number,
    rating?: number
  ): Promise<void> {
    try {
      await db
        .insert(viewHistory)
        .values({
          userId,
          videoId,
          watchDuration,
          completionPercentage,
          rating
        });

      // Update video view count
      await db
        .update(videos)
        .set({ 
          viewCount: sql`${videos.viewCount} + 1`,
          lastViewed: new Date()
        })
        .where(eq(videos.id, videoId));

    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: {
    preferredTags?: string[];
    preferredPerformers?: string[];
    preferredCategories?: string[];
    blockedTags?: string[];
    blockedPerformers?: string[];
    minRating?: number;
    maxDuration?: number;
    minDuration?: number;
  }): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          ...preferences,
          lastRecommendationUpdate: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }
}

export const recommendationEngine = new RecommendationEngine();