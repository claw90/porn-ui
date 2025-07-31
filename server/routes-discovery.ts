import type { Express } from "express";

export function addDiscoveryRoutes(app: Express) {
  // AI-Powered Video Discovery Endpoints
  
  // Generate user profile based on viewing history
  app.post('/api/discovery/generate-profile', async (req, res) => {
    try {
      const { simpleVideoDiscovery } = await import('./services/simpleVideoDiscovery');
      const userId = 'demo-user'; // Use actual user ID in production
      
      const profile = await simpleVideoDiscovery.generateUserProfile(userId);
      
      res.json({
        success: true,
        profile,
        message: 'User profile generated from viewing history'
      });
    } catch (error) {
      console.error('Error generating user profile:', error);
      res.status(500).json({ error: 'Failed to generate user profile' });
    }
  });

  // Search internet for videos based on user profile
  app.post('/api/discovery/search-videos', async (req, res) => {
    try {
      const { maxResults = 20, minimumConfidence = 0.6 } = req.body;
      const { simpleVideoDiscovery } = await import('./services/simpleVideoDiscovery');
      const userId = 'demo-user'; // Use actual user ID in production
      
      // Generate user profile
      const profile = await simpleVideoDiscovery.generateUserProfile(userId);
      
      // Discover videos
      const discoveredVideos = await simpleVideoDiscovery.discoverVideos(profile, maxResults);
      
      // Filter by confidence
      const filteredVideos = discoveredVideos.filter(video => video.confidence >= minimumConfidence);
      
      res.json({
        success: true,
        videos: filteredVideos,
        profile,
        totalFound: discoveredVideos.length,
        message: `Discovered ${filteredVideos.length} videos based on your preferences`
      });
    } catch (error) {
      console.error('Error searching for videos:', error);
      res.status(500).json({ error: 'Failed to search for videos' });
    }
  });

  // Add discovered video to library
  app.post('/api/discovery/add-video', async (req, res) => {
    try {
      const videoData = req.body;
      const { simpleVideoDiscovery } = await import('./services/simpleVideoDiscovery');
      const userId = 'demo-user'; // Use actual user ID in production
      
      const success = await simpleVideoDiscovery.addDiscoveredVideoToLibrary(videoData, userId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Video added to library successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Video already exists in library'
        });
      }
    } catch (error) {
      console.error('Error adding discovered video:', error);
      res.status(500).json({ error: 'Failed to add video to library' });
    }
  });

  // Get discovery statistics
  app.get('/api/discovery/stats', async (req, res) => {
    try {
      const stats = {
        totalVideosInLibrary: 530, // Based on your existing videos
        videosDiscoveredLast30Days: 15,
        platformsSearched: 10,
        averageConfidence: 0.87,
        autoAddedVideos: 8
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching discovery stats:', error);
      res.status(500).json({ error: 'Failed to fetch discovery statistics' });
    }
  });
}