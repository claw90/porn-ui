import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, ExternalLink, Play } from 'lucide-react';
import { SITE_TEXT } from '@/config/siteText';

interface DiscoveredVideo {
  url: string;
  title: string;
  platform: string;
  category: string;
  confidence: number;
  reasoning: string;
  description: string;
  duration: string;
  thumbnail?: string;
}

export default function TestDiscoveryButton() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [discoveredVideos, setDiscoveredVideos] = useState<DiscoveredVideo[]>([]);
  const [addedVideos, setAddedVideos] = useState<Set<string>>(new Set());
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const seedSampleVideos = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch('/api/videos/seed-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: SITE_TEXT.common.success,
          description: result.message
        });
      } else {
        throw new Error('Failed to seed videos');
      }
    } catch (error) {
      console.error('Failed to seed videos:', error);
      toast({
        title: SITE_TEXT.common.error,
        description: "Failed to add sample videos",
        variant: "destructive"
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const runDiscovery = async () => {
    setIsDiscovering(true);
    setProgress(0);
    setDiscoveredVideos([]);

    try {
      // Generate user profile
      setProgress(20);
      const profileResponse = await fetch('/api/discovery/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const profileData = await profileResponse.json();

      // Search for videos
      setProgress(60);
      const searchResponse = await fetch('/api/discovery/search-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxResults: 10,
          minimumConfidence: 0.7
        })
      });
      const searchData = await searchResponse.json();

      setProgress(100);
      
      if (searchData.success && searchData.videos) {
        setDiscoveredVideos(searchData.videos);
        toast({
          title: "Discovery Complete!",
          description: `Found ${searchData.videos.length} recommended videos`
        });
      } else {
        throw new Error('No videos found');
      }

    } catch (error) {
      console.error('Discovery failed:', error);
      toast({
        title: "Discovery Failed",
        description: "Could not discover new videos",
        variant: "destructive"
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const addVideoToLibrary = async (video: DiscoveredVideo) => {
    try {
      const response = await fetch('/api/discovery/add-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video)
      });
      const result = await response.json();

      if (result.success) {
        setAddedVideos(prev => new Set([...prev, video.url]));
        toast({
          title: "Video Added!",
          description: `"${video.title}" has been added to your library`
        });
      } else {
        toast({
          title: "Already in Library",
          description: `"${video.title}" is already in your collection`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to add video:', error);
      toast({
        title: "Error",
        description: "Failed to add video to library",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Discovery Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Test Video Discovery System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-400 mb-4">
            Test the AI-powered video discovery system that finds personalized recommendations across multiple adult platforms.
          </p>
          
          <div className="flex gap-2 mb-4">
            <Button 
              onClick={seedSampleVideos} 
              disabled={isSeeding}
              variant="outline"
              className="flex-1"
            >
              {isSeeding ? 'Adding...' : SITE_TEXT.discovery.sampleVideosButton}
            </Button>
            
            <Button 
              onClick={runDiscovery} 
              disabled={isDiscovering}
              className="flex-1"
            >
              {isDiscovering ? SITE_TEXT.discovery.searchingVideosMessage : SITE_TEXT.discovery.discoverVideosButton}
            </Button>
          </div>

          {isDiscovering && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-zinc-500 text-center">
                {progress < 30 ? 'Analyzing viewing patterns...' : 
                 progress < 70 ? 'Searching platforms...' : 
                 'Processing results...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discovered Videos */}
      {discoveredVideos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Discovered Videos ({discoveredVideos.length})
          </h3>
          
          <div className="grid gap-4">
            {discoveredVideos.map((video, index) => (
              <Card key={index} className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-4">
                  <div className="flex gap-4 mb-3">
                    {/* Video Thumbnail */}
                    <div className="w-32 h-20 bg-zinc-700 rounded-md overflow-hidden flex-shrink-0">
                      <div className="w-full h-full bg-zinc-700 rounded-md overflow-hidden flex items-center justify-center">
                        {video.thumbnail ? (
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              // Fallback to SVG placeholder
                              const target = e.target as HTMLImageElement;
                              const platformColor = video.platform === 'thisvid' ? '#FF6B35' : 
                                                   video.platform === 'pornhub' ? '#FF9000' : '#E50000';
                              const svgData = `
                                <svg width="128" height="80" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="100%" height="100%" fill="${platformColor}"/>
                                  <circle cx="64" cy="40" r="15" fill="rgba(255,255,255,0.9)"/>
                                  <polygon points="58,33 58,47 70,40" fill="${platformColor}"/>
                                  <text x="64" y="65" font-family="Arial" font-size="8" fill="white" text-anchor="middle">${video.platform.toUpperCase()}</text>
                                </svg>
                              `;
                              target.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
                            }}
                          />
                        ) : (
                          // Show SVG placeholder when no thumbnail URL
                          <svg width="128" height="80" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100%" height="100%" fill={
                              video.platform === 'thisvid' ? '#FF6B35' : 
                              video.platform === 'pornhub' ? '#FF9000' : '#E50000'
                            }/>
                            <circle cx="64" cy="40" r="15" fill="rgba(255,255,255,0.9)"/>
                            <polygon points="58,33 58,47 70,40" fill={
                              video.platform === 'thisvid' ? '#FF6B35' : 
                              video.platform === 'pornhub' ? '#FF9000' : '#E50000'
                            }/>
                            <text x="64" y="65" fontFamily="Arial" fontSize="8" fill="white" textAnchor="middle">
                              {video.platform.toUpperCase()}
                            </text>
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">{video.title}</h4>
                      <p className="text-sm text-zinc-400 mb-2">{video.description}</p>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {video.platform}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {video.category}
                        </Badge>
                        <span className="text-xs text-zinc-500">{video.duration}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-zinc-500">Confidence:</span>
                        <div className="w-16 bg-zinc-700 rounded-full h-2">
                          <div 
                            className="h-2 bg-orange-500 rounded-full" 
                            style={{ width: `${video.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-orange-400">
                          {Math.round(video.confidence * 100)}%
                        </span>
                      </div>
                      
                      <p className="text-xs text-zinc-500 italic">{video.reasoning}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Handle login-required sites properly
                          if (video.url.includes('thisvid.com') || video.url.includes('pornhub.com')) {
                            // Open in current tab to maintain login session
                            window.location.href = video.url;
                          } else {
                            // Open in new tab for other sites
                            window.open(video.url, '_blank');
                          }
                        }}
                        className="whitespace-nowrap"
                        title={video.url.includes('thisvid.com') ? 'Login & Watch' : 'Play Video'}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {video.url.includes('thisvid.com') ? 'Login' : 'Play'}
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => addVideoToLibrary(video)}
                        disabled={addedVideos.has(video.url)}
                        className="whitespace-nowrap"
                      >
                        {addedVideos.has(video.url) ? (
                          'Added'
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}