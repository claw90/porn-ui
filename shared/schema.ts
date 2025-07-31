import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, real, json, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  // Recommendation preferences
  preferredTags: json("preferred_tags").$type<string[]>().default([]),
  preferredPerformers: json("preferred_performers").$type<string[]>().default([]),
  preferredCategories: json("preferred_categories").$type<string[]>().default([]),
  blockedTags: json("blocked_tags").$type<string[]>().default([]),
  blockedPerformers: json("blocked_performers").$type<string[]>().default([]),
  minRating: integer("min_rating").default(0),
  maxDuration: integer("max_duration").default(0), // 0 = no limit
  minDuration: integer("min_duration").default(0),
  lastRecommendationUpdate: timestamp("last_recommendation_update"),
});

// Adult content collections/categories
export const collections = pgTable("collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  tags: json("tags").$type<string[]>().default([]),
  isPrivate: boolean("is_private").default(false),
  thumbnailPath: text("thumbnail_path"),
  videoCount: integer("video_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video library management
export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  filename: text("filename"),
  originalName: text("original_name"),
  filePath: text("file_path"),
  videoUrl: text("video_url"), // For external video URLs
  urlHash: text("url_hash").unique(), // For duplicate detection
  duration: integer("duration"), // in seconds
  fileSize: integer("file_size"), // in bytes
  resolution: text("resolution"), // e.g., "1920x1080"
  fps: integer("fps"),
  thumbnailPath: text("thumbnail_path"),
  collectionId: varchar("collection_id").references(() => collections.id),
  tags: json("tags").$type<string[]>().default([]),
  performers: json("performers").$type<string[]>().default([]),
  categories: json("categories").$type<string[]>().default([]),
  rating: integer("rating").default(0), // 1-5 stars
  notes: text("notes"),
  isBookmarked: boolean("is_bookmarked").default(false),
  isFavorite: boolean("is_favorite").default(false),
  isExternal: boolean("is_external").default(false), // True for URL-based videos
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastViewed: timestamp("last_viewed"),
});

// Performer/actor database with internet search capabilities
export const performers = pgTable("performers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  aliases: json("aliases").$type<string[]>().default([]),
  faceImagePath: text("face_image_path"),
  description: text("description"),
  tags: json("tags").$type<string[]>().default([]),
  videoCount: integer("video_count").default(0),
  rating: integer("rating").default(0),
  isVerified: boolean("is_verified").default(false),
  // Enhanced performer data from internet search
  age: integer("age"),
  nationality: text("nationality"),
  height: text("height"),
  weight: text("weight"),
  hairColor: text("hair_color"),
  eyeColor: text("eye_color"),
  ethnicity: text("ethnicity"),
  bodyType: text("body_type"),
  socialMedia: json("social_media").$type<{twitter?: string, instagram?: string, onlyfans?: string, website?: string}>().default({}),
  websites: json("websites").$type<string[]>().default([]),
  biography: text("biography"),
  careerStart: integer("career_start"),
  searchResults: json("search_results").$type<any[]>().default([]), // Store internet search results
  confidence: real("confidence").default(0), // AI confidence in identification
  sourceImages: json("source_images").$type<string[]>().default([]), // URLs of found images
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Internet search results for performer identification
export const performerSearches = pgTable("performer_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  performerId: varchar("performer_id").references(() => performers.id),
  searchImagePath: text("search_image_path").notNull(),
  searchQuery: text("search_query"),
  searchEngine: text("search_engine").notNull(), // 'google', 'bing', 'yandex', etc
  resultsFound: integer("results_found").default(0),
  confidence: real("confidence").default(0),
  status: text("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  results: json("results").$type<any[]>().default([]),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyses = pgTable("analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").references(() => videos.id),
  performerId: varchar("performer_id").references(() => performers.id),
  videoFilename: text("video_filename"),
  videoPath: text("video_path"),
  targetFaceFilename: text("target_face_filename"),
  targetFacePath: text("target_face_path"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, error
  tolerance: real("tolerance").notNull().default(0.5),
  frameSkip: integer("frame_skip").notNull().default(5),
  includeThumbnails: integer("include_thumbnails").notNull().default(1), // 1 for true, 0 for false
  processingTime: integer("processing_time"), // in seconds
  matchCount: integer("match_count").default(0),
  matches: json("matches").$type<AnalysisMatch[]>().default([]),
  reportPath: text("report_path"),
  confidenceAvg: real("confidence_avg").default(0), // Average confidence
  reportConfig: json("report_config").$type<ReportConfiguration>(), // Custom report settings
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Report templates for customization
export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isSystem: boolean("is_system").default(false), // Built-in templates
  theme: text("theme").notNull().default("professional"), // professional, dark, minimal, branded
  layout: text("layout").notNull().default("standard"), // standard, compact, detailed, executive
  sections: json("sections").$type<ReportSection[]>().default([]),
  styling: json("styling").$type<ReportStyling>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Playlists for content organization
export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  videoIds: json("video_ids").$type<string[]>().default([]),
  thumbnailPath: text("thumbnail_path"),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Video view tracking for duplicate detection and watch history
export const videoViews = pgTable("video_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: text("user_id").default("demo-user"), // For future user system
  viewedAt: timestamp("viewed_at").defaultNow(),
  duration: integer("duration"), // How long they watched in seconds
  completed: boolean("completed").default(false), // If they watched to the end
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// Duplicate detection log
export const duplicateLog = pgTable("duplicate_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalVideoId: varchar("original_video_id").notNull().references(() => videos.id),
  duplicateUrl: text("duplicate_url").notNull(),
  urlHash: text("url_hash").notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow(),
  userId: text("user_id").default("demo-user"),
  blocked: boolean("blocked").default(true), // Whether the duplicate was blocked
});

// User viewing history and interactions
export const viewHistory = pgTable("view_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  watchDuration: integer("watch_duration").default(0), // seconds watched
  completionPercentage: real("completion_percentage").default(0), // 0-100
  rating: integer("rating"), // User's rating for this video
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Recommendation scores cache
export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  score: real("score").notNull(), // Recommendation confidence 0-1
  reason: text("reason"), // Why this was recommended
  algorithm: text("algorithm").default("collaborative"), // collaborative, content, hybrid
  createdAt: timestamp("created_at").defaultNow(),
  isViewed: boolean("is_viewed").default(false),
});

// Search history and recommendation learning
export const searchHistory = pgTable("search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  query: text("query").notNull(),
  resultCount: integer("result_count").default(0),
  clickedResults: json("clicked_results").$type<string[]>().default([]), // Video IDs that were clicked
  addedToCollection: json("added_to_collection").$type<string[]>().default([]), // Videos added from this search
  searchedAt: timestamp("searched_at").defaultNow(),
  platform: text("platform").default('internet'), // 'internet', 'collection', etc
});

// Tag recommendation tracking
export const tagRecommendations = pgTable("tag_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  tag: text("tag").notNull(),
  searchCount: integer("search_count").default(1),
  clickCount: integer("click_count").default(0),
  addCount: integer("add_count").default(0), // How many videos with this tag were added
  lastSearched: timestamp("last_searched").defaultNow(),
  confidence: real("confidence").default(0.5), // How likely user is to like this tag
  category: text("category").default('general'), // 'body_type', 'activity', 'style', etc
});

// Popular/trending tags across all users
export const popularTags = pgTable("popular_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tag: text("tag").notNull().unique(),
  searchCount: integer("search_count").default(1),
  userCount: integer("user_count").default(1), // How many unique users searched this
  addCount: integer("add_count").default(0), // How many videos with this tag were added
  category: text("category").default('general'),
  trending: boolean("trending").default(false),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export interface AnalysisMatch {
  frameNumber: number;
  timestamp: string;
  confidence: number;
  thumbnailPath?: string;
}

export interface ReportConfiguration {
  templateId?: string;
  customTitle?: string;
  includeCharts: boolean;
  includeMatchThumbnails: boolean;
  includeTimeline: boolean;
  includeStatistics: boolean;
  includeMetadata: boolean;
  confidenceThreshold: number;
  maxMatchesDisplay: number;
  pageFormat: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  theme: 'professional' | 'dark' | 'minimal' | 'branded';
  watermark?: string;
  logoPath?: string;
  customStyles?: ReportStyling;
  exportFormats: Array<'pdf' | 'html' | 'docx' | 'excel'>;
}

export interface ReportSection {
  id: string;
  type: 'header' | 'summary' | 'settings' | 'matches' | 'charts' | 'timeline' | 'footer' | 'custom';
  title?: string;
  enabled: boolean;
  order: number;
  content?: string;
  configuration?: Record<string, any>;
}

export interface ReportStyling {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: {
    heading: number;
    body: number;
    caption: number;
  };
  spacing: {
    section: number;
    paragraph: number;
    margin: number;
  };
  borderRadius: number;
  showBorders: boolean;
  showShadows: boolean;
  backgroundPattern?: string;
}

// Core type exports
export type User = typeof users.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Performer = typeof performers.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type ViewHistory = typeof viewHistory.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type TagRecommendation = typeof tagRecommendations.$inferSelect;
export type PopularTag = typeof popularTags.$inferSelect;

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});



export const insertViewHistorySchema = createInsertSchema(viewHistory).pick({
  userId: true,
  videoId: true,
  watchDuration: true,
  completionPercentage: true,
  rating: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).pick({
  userId: true,
  videoId: true,
  score: true,
  reason: true,
  algorithm: true,
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).pick({
  userId: true,
  query: true,
  resultCount: true,
  clickedResults: true,
  addedToCollection: true,
  platform: true,
});

export const insertTagRecommendationSchema = createInsertSchema(tagRecommendations).pick({
  userId: true,
  tag: true,
  searchCount: true,
  clickCount: true,
  addCount: true,
  confidence: true,
  category: true,
});

export const updateUserPreferencesSchema = createInsertSchema(users).pick({
  preferredTags: true,
  preferredPerformers: true,
  preferredCategories: true,
  blockedTags: true,
  blockedPerformers: true,
  minRating: true,
  maxDuration: true,
  minDuration: true,
});

export const insertCollectionSchema = createInsertSchema(collections).pick({
  name: true,
  description: true,
  tags: true,
  isPrivate: true,
  thumbnailPath: true,
});

export const insertVideoSchema = createInsertSchema(videos).pick({
  title: true,
  filename: true,
  originalName: true,
  filePath: true,
  videoUrl: true,
  duration: true,
  fileSize: true,
  resolution: true,
  fps: true,
  thumbnailPath: true,
  collectionId: true,
  tags: true,
  performers: true,
  categories: true,
  rating: true,
  notes: true,
  isBookmarked: true,
  isFavorite: true,
  isExternal: true,
});

// Schema specifically for URL-based videos
export const insertVideoUrlSchema = createInsertSchema(videos).pick({
  title: true,
  videoUrl: true,
  thumbnailPath: true,
  tags: true,
  performers: true,
  categories: true,
  notes: true,
  isExternal: true,
}).extend({
  isExternal: z.boolean().default(true),
});

export const insertPerformerSchema = createInsertSchema(performers).pick({
  name: true,
  aliases: true,
  faceImagePath: true,
  description: true,
  tags: true,
  rating: true,
  isVerified: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  videoId: true,
  performerId: true,
  videoFilename: true,
  videoPath: true,
  targetFaceFilename: true,
  targetFacePath: true,
  tolerance: true,
  frameSkip: true,
  includeThumbnails: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).pick({
  name: true,
  description: true,
  videoIds: true,
  thumbnailPath: true,
  isPrivate: true,
});

export const updateAnalysisSchema = createInsertSchema(analyses).pick({
  status: true,
  processingTime: true,
  matchCount: true,
  matches: true,
  reportPath: true,
  confidenceAvg: true,
  completedAt: true,
});

// Insert schema types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type InsertPerformer = z.infer<typeof insertPerformerSchema>;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type UpdateAnalysis = z.infer<typeof updateAnalysisSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type InsertViewHistory = z.infer<typeof insertViewHistorySchema>;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type InsertTagRecommendation = z.infer<typeof insertTagRecommendationSchema>;
export type InsertPopularTag = typeof popularTags.$inferInsert;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;

// Additional utility types
export const insertVideoViewSchema = createInsertSchema(videoViews);
export type InsertVideoView = z.infer<typeof insertVideoViewSchema>;
export type VideoView = typeof videoViews.$inferSelect;

export const insertDuplicateLogSchema = createInsertSchema(duplicateLog);
export type InsertDuplicateLog = z.infer<typeof insertDuplicateLogSchema>;
export type DuplicateLog = typeof duplicateLog.$inferSelect;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
