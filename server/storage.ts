import { 
  users, analyses, videos, performers, collections, playlists, reportTemplates, viewHistory, recommendations,
  searchHistory, tagRecommendations, popularTags,
  type User, type InsertUser, type Analysis, type InsertAnalysis, type UpdateAnalysis,
  type Video, type InsertVideo, type Performer, type InsertPerformer,
  type Collection, type InsertCollection, type InsertPlaylist,
  type ReportTemplate, type InsertReportTemplate, type ViewHistory, type InsertViewHistory,
  type Recommendation, type InsertRecommendation, type SearchHistory, type InsertSearchHistory,
  type TagRecommendation, type InsertTagRecommendation, type PopularTag, type InsertPopularTag,
  insertVideoUrlSchema
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, desc, like, or, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Video library methods
  createVideo(video: InsertVideo): Promise<Video>;
  createVideoFromUrl(videoData: z.infer<typeof insertVideoUrlSchema>): Promise<Video>;
  getVideo(id: string): Promise<Video | undefined>;
  getVideos(limit?: number, offset?: number): Promise<Video[]>;
  updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: string): Promise<boolean>;
  searchVideos(query: string): Promise<Video[]>;
  getVideosByCollection(collectionId: string): Promise<Video[]>;
  getVideosByPerformer(performerName: string): Promise<Video[]>;
  getFavoriteVideos(): Promise<Video[]>;
  getBookmarkedVideos(): Promise<Video[]>;

  // Performer methods
  createPerformer(performer: InsertPerformer): Promise<Performer>;
  getPerformer(id: string): Promise<Performer | undefined>;
  getPerformers(limit?: number): Promise<Performer[]>;
  updatePerformer(id: string, updates: Partial<InsertPerformer>): Promise<Performer | undefined>;
  deletePerformer(id: string): Promise<boolean>;
  searchPerformers(query: string): Promise<Performer[]>;

  // Collection methods
  createCollection(collection: InsertCollection): Promise<Collection>;
  getCollection(id: string): Promise<Collection | undefined>;
  getCollections(): Promise<Collection[]>;
  updateCollection(id: string, updates: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: string): Promise<boolean>;

  // Playlist methods
  createPlaylist(playlist: InsertPlaylist): Promise<any>;
  getPlaylist(id: string): Promise<any | undefined>;
  getPlaylists(): Promise<any[]>;
  updatePlaylist(id: string, updates: Partial<InsertPlaylist>): Promise<any | undefined>;
  deletePlaylist(id: string): Promise<boolean>;

  // Analysis methods
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: string): Promise<Analysis | undefined>;
  updateAnalysis(id: string, updates: Partial<Analysis>): Promise<Analysis | undefined>;
  getAllAnalyses(): Promise<Analysis[]>;
  getRecentAnalyses(limit?: number): Promise<Analysis[]>;
  getAnalysesByVideo(videoId: string): Promise<Analysis[]>;
  getAnalysesByPerformer(performerId: string): Promise<Analysis[]>;

  // Report template methods
  getReportTemplates(): Promise<ReportTemplate[]>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string): Promise<boolean>;

  // Recommendation methods
  getRecommendations(userId: string, limit?: number): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: string, updates: Partial<Recommendation>): Promise<Recommendation | undefined>;
  deleteRecommendation(id: string): Promise<boolean>;

  // Search history and tag recommendation methods
  getSearchHistory(userId: string, limit?: number): Promise<SearchHistory[]>;
  addSearchHistory(userId: string, query: string, resultCount: number): Promise<SearchHistory>;
  clearSearchHistory(userId: string): Promise<boolean>;
  getRecommendedTags(userId: string, limit?: number): Promise<string[]>;
  updateTagRecommendations(userId: string, query: string): Promise<void>;
  getPopularTags(limit?: number): Promise<string[]>;

  // View history methods
  getViewHistory(userId: string, limit?: number): Promise<ViewHistory[]>;
  createViewHistory(viewHistory: InsertViewHistory): Promise<ViewHistory>;
  updateViewHistory(id: string, updates: Partial<ViewHistory>): Promise<ViewHistory | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db
      .insert(analyses)
      .values({
        ...insertAnalysis,
        status: "pending",
        tolerance: insertAnalysis.tolerance ?? 0.5,
        frameSkip: insertAnalysis.frameSkip ?? 5,
        includeThumbnails: insertAnalysis.includeThumbnails ?? 1,
        matchCount: 0,
        matches: [],
        processingTime: null,
        reportPath: null,
        createdAt: new Date(),
        completedAt: null,
      })
      .returning();
    return analysis;
  }

  async getAnalysis(id: string): Promise<Analysis | undefined> {
    try {
      const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
      return analysis || undefined;
    } catch (error) {
      console.error('Error getting analysis:', error);
      return undefined;
    }
  }

  async updateAnalysis(id: string, updates: Partial<UpdateAnalysis>): Promise<Analysis | undefined> {
    try {
      const updateData: any = { ...updates };
      const [updatedAnalysis] = await db
        .update(analyses)
        .set(updateData)
        .where(eq(analyses.id, id))
        .returning();
      return updatedAnalysis || undefined;
    } catch (error) {
      console.error('Error updating analysis:', error);
      return undefined;
    }
  }

  async getAllAnalyses(): Promise<Analysis[]> {
    try {
      const allAnalyses = await db
        .select()
        .from(analyses)
        .orderBy(desc(analyses.createdAt));
      return allAnalyses;
    } catch (error) {
      console.error('Error getting all analyses:', error);
      return [];
    }
  }

  async getRecentAnalyses(limit = 5): Promise<Analysis[]> {
    try {
      const recentAnalyses = await db
        .select()
        .from(analyses)
        .orderBy(desc(analyses.createdAt))
        .limit(limit);
      return recentAnalyses;
    } catch (error) {
      console.error('Error getting recent analyses:', error);
      return [];
    }
  }

  async getAnalysesByVideo(videoId: string): Promise<Analysis[]> {
    try {
      const videoAnalyses = await db
        .select()
        .from(analyses)
        .where(eq(analyses.videoId, videoId))
        .orderBy(desc(analyses.createdAt));
      return videoAnalyses;
    } catch (error) {
      console.error('Error getting analyses by video:', error);
      return [];
    }
  }

  async getAnalysesByPerformer(performerId: string): Promise<Analysis[]> {
    try {
      const performerAnalyses = await db
        .select()
        .from(analyses)
        .where(eq(analyses.performerId, performerId))
        .orderBy(desc(analyses.createdAt));
      return performerAnalyses;
    } catch (error) {
      console.error('Error getting analyses by performer:', error);
      return [];
    }
  }

  // Video library methods
  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db
      .insert(videos)
      .values(insertVideo)
      .returning();
    return video;
  }

  async createVideoFromUrl(videoData: z.infer<typeof insertVideoUrlSchema>): Promise<Video> {
    try {
      // Extract video title from URL if not provided
      let title = videoData.title;
      if (!title && videoData.videoUrl) {
        // Try to extract a meaningful title from the URL
        const urlParts = videoData.videoUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        title = lastPart.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ') || 'External Video';
      }

      const [video] = await db
        .insert(videos)
        .values({
          title: title || 'External Video',
          videoUrl: videoData.videoUrl,
          urlHash: videoData.videoUrl ? Buffer.from(videoData.videoUrl).toString('base64') : null,
          thumbnailPath: videoData.thumbnailPath,
          tags: videoData.tags || [],
          performers: videoData.performers || [],
          categories: videoData.categories || [],
          notes: videoData.notes,
          isExternal: true,
          filename: null,
          originalName: null,
          filePath: null,
          duration: null,
          fileSize: null,
          resolution: null,
          fps: null,
          collectionId: null,
          rating: 0,
          isBookmarked: false,
          isFavorite: false,
          viewCount: 0,
          createdAt: new Date(),
          lastViewed: null,
        })
        .returning();
      return video;
    } catch (error) {
      console.error('Error creating video from URL:', error);
      throw new Error('Failed to create video from URL');
    }
  }

  async getVideo(id: string): Promise<Video | undefined> {
    try {
      const [video] = await db.select().from(videos).where(eq(videos.id, id));
      return video || undefined;
    } catch (error) {
      console.error('Error getting video:', error);
      return undefined;
    }
  }

  async getVideos(limit = 50, offset = 0): Promise<Video[]> {
    try {
      const videosList = await db
        .select()
        .from(videos)
        .orderBy(desc(videos.createdAt))
        .limit(limit)
        .offset(offset);
      return videosList;
    } catch (error) {
      console.error('Error getting videos:', error);
      return [];
    }
  }

  async updateVideo(id: string, updates: Partial<InsertVideo>): Promise<Video | undefined> {
    try {
      const [updatedVideo] = await db
        .update(videos)
        .set(updates)
        .where(eq(videos.id, id))
        .returning();
      return updatedVideo || undefined;
    } catch (error) {
      console.error('Error updating video:', error);
      return undefined;
    }
  }

  async deleteVideo(id: string): Promise<boolean> {
    try {
      await db.delete(videos).where(eq(videos.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }

  async searchVideos(query: string): Promise<Video[]> {
    try {
      const searchResults = await db
        .select()
        .from(videos)
        .where(
          or(
            like(videos.originalName, `%${query}%`),
            like(videos.notes, `%${query}%`)
          )
        )
        .orderBy(desc(videos.createdAt));
      return searchResults;
    } catch (error) {
      console.error('Error searching videos:', error);
      return [];
    }
  }

  async getVideosByCollection(collectionId: string): Promise<Video[]> {
    try {
      const collectionVideos = await db
        .select()
        .from(videos)
        .where(eq(videos.collectionId, collectionId))
        .orderBy(desc(videos.createdAt));
      return collectionVideos;
    } catch (error) {
      console.error('Error getting videos by collection:', error);
      return [];
    }
  }

  async getVideosByPerformer(performerName: string): Promise<Video[]> {
    try {
      const performerVideos = await db
        .select()
        .from(videos)
        .orderBy(desc(videos.createdAt));
      // Filter by performer in application layer since JSON search is complex
      return performerVideos.filter(video => 
        video.performers && video.performers.includes(performerName)
      );
    } catch (error) {
      console.error('Error getting videos by performer:', error);
      return [];
    }
  }

  async getFavoriteVideos(): Promise<Video[]> {
    try {
      const favorites = await db
        .select()
        .from(videos)
        .where(eq(videos.isFavorite, true))
        .orderBy(desc(videos.lastViewed));
      return favorites;
    } catch (error) {
      console.error('Error getting favorite videos:', error);
      return [];
    }
  }

  async getBookmarkedVideos(): Promise<Video[]> {
    try {
      const bookmarks = await db
        .select()
        .from(videos)
        .where(eq(videos.isBookmarked, true))
        .orderBy(desc(videos.createdAt));
      return bookmarks;
    } catch (error) {
      console.error('Error getting bookmarked videos:', error);
      return [];
    }
  }

  // Performer methods
  async createPerformer(insertPerformer: InsertPerformer): Promise<Performer> {
    const [performer] = await db
      .insert(performers)
      .values(insertPerformer)
      .returning();
    return performer;
  }

  async getPerformer(id: string): Promise<Performer | undefined> {
    try {
      const [performer] = await db.select().from(performers).where(eq(performers.id, id));
      return performer || undefined;
    } catch (error) {
      console.error('Error getting performer:', error);
      return undefined;
    }
  }

  async getPerformers(limit = 50): Promise<Performer[]> {
    try {
      const performersList = await db
        .select()
        .from(performers)
        .orderBy(desc(performers.videoCount))
        .limit(limit);
      return performersList;
    } catch (error) {
      console.error('Error getting performers:', error);
      return [];
    }
  }

  async updatePerformer(id: string, updates: Partial<InsertPerformer>): Promise<Performer | undefined> {
    try {
      const [updatedPerformer] = await db
        .update(performers)
        .set(updates)
        .where(eq(performers.id, id))
        .returning();
      return updatedPerformer || undefined;
    } catch (error) {
      console.error('Error updating performer:', error);
      return undefined;
    }
  }

  async deletePerformer(id: string): Promise<boolean> {
    try {
      await db.delete(performers).where(eq(performers.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting performer:', error);
      return false;
    }
  }

  async searchPerformers(query: string): Promise<Performer[]> {
    try {
      const searchResults = await db
        .select()
        .from(performers)
        .where(
          or(
            like(performers.name, `%${query}%`),
            like(performers.description, `%${query}%`)
          )
        )
        .orderBy(desc(performers.videoCount));
      return searchResults;
    } catch (error) {
      console.error('Error searching performers:', error);
      return [];
    }
  }

  // Collection methods
  async createCollection(insertCollection: InsertCollection): Promise<Collection> {
    const [collection] = await db
      .insert(collections)
      .values(insertCollection)
      .returning();
    return collection;
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    try {
      const [collection] = await db.select().from(collections).where(eq(collections.id, id));
      return collection || undefined;
    } catch (error) {
      console.error('Error getting collection:', error);
      return undefined;
    }
  }

  async getCollections(): Promise<Collection[]> {
    try {
      const collectionsList = await db
        .select()
        .from(collections)
        .orderBy(desc(collections.createdAt));
      return collectionsList;
    } catch (error) {
      console.error('Error getting collections:', error);
      return [];
    }
  }

  async updateCollection(id: string, updates: Partial<InsertCollection>): Promise<Collection | undefined> {
    try {
      const [updatedCollection] = await db
        .update(collections)
        .set(updates)
        .where(eq(collections.id, id))
        .returning();
      return updatedCollection || undefined;
    } catch (error) {
      console.error('Error updating collection:', error);
      return undefined;
    }
  }

  async deleteCollection(id: string): Promise<boolean> {
    try {
      await db.delete(collections).where(eq(collections.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting collection:', error);
      return false;
    }
  }

  // Playlist methods
  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const [playlist] = await db
      .insert(playlists)
      .values(insertPlaylist)
      .returning();
    return playlist;
  }

  async getPlaylist(id: string): Promise<Playlist | undefined> {
    try {
      const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id));
      return playlist || undefined;
    } catch (error) {
      console.error('Error getting playlist:', error);
      return undefined;
    }
  }

  async getPlaylists(): Promise<Playlist[]> {
    try {
      const playlistsList = await db
        .select()
        .from(playlists)
        .orderBy(desc(playlists.createdAt));
      return playlistsList;
    } catch (error) {
      console.error('Error getting playlists:', error);
      return [];
    }
  }

  async updatePlaylist(id: string, updates: Partial<InsertPlaylist>): Promise<Playlist | undefined> {
    try {
      const [updatedPlaylist] = await db
        .update(playlists)
        .set(updates)
        .where(eq(playlists.id, id))
        .returning();
      return updatedPlaylist || undefined;
    } catch (error) {
      console.error('Error updating playlist:', error);
      return undefined;
    }
  }

  async deletePlaylist(id: string): Promise<boolean> {
    try {
      await db.delete(playlists).where(eq(playlists.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return false;
    }
  }

  // Analysis methods
  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db
      .insert(analyses)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  async getAnalysis(id: string): Promise<Analysis | undefined> {
    try {
      const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
      return analysis || undefined;
    } catch (error) {
      console.error('Error getting analysis:', error);
      return undefined;
    }
  }

  async updateAnalysis(id: string, updates: Partial<Analysis>): Promise<Analysis | undefined> {
    try {
      const [updatedAnalysis] = await db
        .update(analyses)
        .set(updates)
        .where(eq(analyses.id, id))
        .returning();
      return updatedAnalysis || undefined;
    } catch (error) {
      console.error('Error updating analysis:', error);
      return undefined;
    }
  }

  async getAllAnalyses(): Promise<Analysis[]> {
    try {
      const analysesList = await db
        .select()
        .from(analyses)
        .orderBy(desc(analyses.createdAt));
      return analysesList;
    } catch (error) {
      console.error('Error getting all analyses:', error);
      return [];
    }
  }

  async getRecentAnalyses(limit = 5): Promise<Analysis[]> {
    try {
      const recentAnalyses = await db
        .select()
        .from(analyses)
        .orderBy(desc(analyses.createdAt))
        .limit(limit);
      return recentAnalyses;
    } catch (error) {
      console.error('Error getting recent analyses:', error);
      return [];
    }
  }

  async getAnalysesByVideo(videoId: string): Promise<Analysis[]> {
    try {
      const videoAnalyses = await db
        .select()
        .from(analyses)
        .where(eq(analyses.videoId, videoId))
        .orderBy(desc(analyses.createdAt));
      return videoAnalyses;
    } catch (error) {
      console.error('Error getting analyses by video:', error);
      return [];
    }
  }

  async getAnalysesByPerformer(performerId: string): Promise<Analysis[]> {
    try {
      const performerAnalyses = await db
        .select()
        .from(analyses)
        .where(eq(analyses.performerId, performerId))
        .orderBy(desc(analyses.createdAt));
      return performerAnalyses;
    } catch (error) {
      console.error('Error getting analyses by performer:', error);
      return [];
    }
  }

  // Report template methods
  async getReportTemplates(): Promise<ReportTemplate[]> {
    try {
      const templates = await db
        .select()
        .from(reportTemplates)
        .orderBy(desc(reportTemplates.isDefault), desc(reportTemplates.createdAt));
      return templates;
    } catch (error) {
      console.error('Error getting report templates:', error);
      return [];
    }
  }

  async createReportTemplate(insertTemplate: InsertReportTemplate): Promise<ReportTemplate> {
    const [template] = await db
      .insert(reportTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async updateReportTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate | undefined> {
    try {
      const [updatedTemplate] = await db
        .update(reportTemplates)
        .set(updates)
        .where(eq(reportTemplates.id, id))
        .returning();
      return updatedTemplate || undefined;
    } catch (error) {
      console.error('Error updating report template:', error);
      return undefined;
    }
  }

  async deleteReportTemplate(id: string): Promise<boolean> {
    try {
      await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting report template:', error);
      return false;
    }
  }

  // Recommendation methods
  async getRecommendations(userId: string, limit = 20): Promise<Recommendation[]> {
    try {
      const userRecommendations = await db
        .select()
        .from(recommendations)
        .where(eq(recommendations.userId, userId))
        .orderBy(desc(recommendations.score), desc(recommendations.createdAt))
        .limit(limit);
      return userRecommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const [recommendation] = await db
      .insert(recommendations)
      .values(insertRecommendation)
      .returning();
    return recommendation;
  }

  async updateRecommendation(id: string, updates: Partial<Recommendation>): Promise<Recommendation | undefined> {
    try {
      const [updatedRecommendation] = await db
        .update(recommendations)
        .set(updates)
        .where(eq(recommendations.id, id))
        .returning();
      return updatedRecommendation || undefined;
    } catch (error) {
      console.error('Error updating recommendation:', error);
      return undefined;
    }
  }

  async deleteRecommendation(id: string): Promise<boolean> {
    try {
      await db.delete(recommendations).where(eq(recommendations.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      return false;
    }
  }

  // View history methods
  async getViewHistory(userId: string, limit = 50): Promise<ViewHistory[]> {
    try {
      const userHistory = await db
        .select()
        .from(viewHistory)
        .where(eq(viewHistory.userId, userId))
        .orderBy(desc(viewHistory.viewedAt))
        .limit(limit);
      return userHistory;
    } catch (error) {
      console.error('Error getting view history:', error);
      return [];
    }
  }

  async createViewHistory(insertViewHistory: InsertViewHistory): Promise<ViewHistory> {
    const [history] = await db
      .insert(viewHistory)
      .values(insertViewHistory)
      .returning();
    return history;
  }

  async updateViewHistory(id: string, updates: Partial<ViewHistory>): Promise<ViewHistory | undefined> {
    try {
      const [updatedHistory] = await db
        .update(viewHistory)
        .set(updates)
        .where(eq(viewHistory.id, id))
        .returning();
      return updatedHistory || undefined;
    } catch (error) {
      console.error('Error updating view history:', error);
      return undefined;
    }
  }
  // Search history and tag recommendation methods
  async getSearchHistory(userId: string, limit = 50): Promise<SearchHistory[]> {
    try {
      const history = await db
        .select()
        .from(searchHistory)
        .where(eq(searchHistory.userId, userId))
        .orderBy(desc(searchHistory.searchedAt))
        .limit(limit);
      return history;
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  async addSearchHistory(userId: string, query: string, resultCount: number): Promise<SearchHistory> {
    const [history] = await db
      .insert(searchHistory)
      .values({
        userId,
        query,
        resultCount,
        clickedResults: [],
        addedToCollection: [],
        platform: 'internet'
      })
      .returning();
    return history;
  }

  async clearSearchHistory(userId: string): Promise<boolean> {
    try {
      await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
      return true;
    } catch (error) {
      console.error('Error clearing search history:', error);
      return false;
    }
  }

  async getRecommendedTags(userId: string, limit = 20): Promise<string[]> {
    try {
      const tags = await db
        .select({ tag: tagRecommendations.tag })
        .from(tagRecommendations)
        .where(eq(tagRecommendations.userId, userId))
        .orderBy(desc(tagRecommendations.confidence), desc(tagRecommendations.lastSearched))
        .limit(limit);
      return tags.map(t => t.tag);
    } catch (error) {
      console.error('Error getting recommended tags:', error);
      return [];
    }
  }

  async updateTagRecommendations(userId: string, query: string): Promise<void> {
    try {
      // Extract potential tags from the search query
      const tags = query.toLowerCase().split(/\s+/).filter(tag => tag.length > 2);
      
      for (const tag of tags) {
        // Check if tag recommendation already exists
        const [existing] = await db
          .select()
          .from(tagRecommendations)
          .where(and(
            eq(tagRecommendations.userId, userId),
            eq(tagRecommendations.tag, tag)
          ))
          .limit(1);

        if (existing) {
          // Update existing tag recommendation
          await db
            .update(tagRecommendations)
            .set({
              searchCount: existing.searchCount + 1,
              lastSearched: new Date(),
              confidence: Math.min(1.0, existing.confidence + 0.1)
            })
            .where(eq(tagRecommendations.id, existing.id));
        } else {
          // Create new tag recommendation
          await db
            .insert(tagRecommendations)
            .values({
              userId,
              tag,
              searchCount: 1,
              clickCount: 0,
              addCount: 0,
              confidence: 0.5,
              category: 'general'
            });
        }

        // Also update popular tags
        const [popularTag] = await db
          .select()
          .from(popularTags)
          .where(eq(popularTags.tag, tag))
          .limit(1);

        if (popularTag) {
          await db
            .update(popularTags)
            .set({
              searchCount: popularTag.searchCount + 1,
              lastUpdated: new Date()
            })
            .where(eq(popularTags.id, popularTag.id));
        } else {
          await db
            .insert(popularTags)
            .values({
              tag,
              searchCount: 1,
              userCount: 1,
              addCount: 0,
              category: 'general',
              trending: false
            });
        }
      }
    } catch (error) {
      console.error('Error updating tag recommendations:', error);
    }
  }

  async getPopularTags(limit = 20): Promise<string[]> {
    try {
      const tags = await db
        .select({ tag: popularTags.tag })
        .from(popularTags)
        .orderBy(desc(popularTags.searchCount), desc(popularTags.userCount))
        .limit(limit);
      return tags.map(t => t.tag);
    } catch (error) {
      console.error('Error getting popular tags:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
