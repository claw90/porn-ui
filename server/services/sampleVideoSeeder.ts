import { db } from '../db';
import { videos } from '@shared/schema';
import { eq } from 'drizzle-orm';

const SAMPLE_VIDEOS = [
  {
    title: "Hot Muscle Workout Session",
    videoUrl: "https://www.thisvid.com/videos/muscle-workout-session/",
    category: "muscle",
    tags: ["muscle", "workout", "amateur"],
    isExternal: true,
    userId: "demo-user",
    urlHash: null
  },
  {
    title: "Young Twink First Experience", 
    videoUrl: "https://www.pornhub.com/view_video.php?viewkey=ph123twink",
    category: "twink", 
    tags: ["twink", "young", "amateur"],
    isExternal: true,
    userId: "demo-user",
    urlHash: null
  },
  {
    title: "Daddy Bear Morning Fun",
    videoUrl: "https://www.xvideos.com/video123456/daddy-bear-fun",
    category: "bear",
    tags: ["bear", "daddy", "mature"],
    isExternal: true,
    userId: "demo-user",
    urlHash: null
  },
  {
    title: "Bareback Action Compilation",
    videoUrl: "https://www.redtube.com/bareback-compilation",
    category: "bareback",
    tags: ["bareback", "compilation", "raw"],
    isExternal: true,
    userId: "demo-user",
    urlHash: null
  },
  {
    title: "College Dorm Party",
    videoUrl: "https://www.xhamster.com/videos/college-dorm-party",
    category: "college",
    tags: ["college", "group", "young"],
    isExternal: true,
    userId: "demo-user",
    urlHash: null
  }
];

export class SampleVideoSeeder {
  async seedSampleVideos(): Promise<number> {
    try {
      let addedCount = 0;
      
      for (const video of SAMPLE_VIDEOS) {
        try {
          // Check if video already exists by URL - use simple select
          const existing = await db
            .select({ id: videos.id })
            .from(videos)
            .where(eq(videos.videoUrl, video.videoUrl))
            .limit(1);

          if (existing.length === 0) {
            // Generate a simple hash for the URL for duplicate detection
            const crypto = await import('crypto');
            const urlHash = crypto.createHash('md5').update(video.videoUrl).digest('hex');
            
            // Insert video without urlHash field for now to avoid schema issues
            await db.insert(videos).values({
              title: video.title,
              videoUrl: video.videoUrl,
              categories: [video.category],
              tags: video.tags,
              isExternal: video.isExternal
            });
            addedCount++;
            console.log(`Added sample video: ${video.title}`);
          } else {
            console.log(`Sample video already exists: ${video.title}`);
          }
        } catch (error) {
          console.error(`Error adding sample video ${video.title}:`, error);
        }
      }
      
      return addedCount;
    } catch (error) {
      console.error('Error seeding sample videos:', error);
      return 0;
    }
  }

  async clearSampleVideos(): Promise<number> {
    try {
      let deletedCount = 0;
      
      for (const video of SAMPLE_VIDEOS) {
        const result = await db
          .delete(videos)
          .where(eq(videos.videoUrl, video.videoUrl));
        
        if (result) deletedCount++;
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error clearing sample videos:', error);
      return 0;
    }
  }
}

export const sampleVideoSeeder = new SampleVideoSeeder();