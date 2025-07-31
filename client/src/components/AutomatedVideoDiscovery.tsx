import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Search, 
  Video, 
  Star, 
  Play, 
  Plus, 
  Settings, 
  Brain,
  Zap,
  Target,
  CheckCircle,
  Clock,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DiscoveredVideo {
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

interface DiscoverySettings {
  enabled: boolean;
  maxVideosPerSession: number;
  minimumConfidence: number;
  autoAddHighConfidence: boolean;
  discoveryInterval: number; // hours
}

export default function AutomatedVideoDiscovery() {
  const [discoverySettings, setDiscoverySettings] = useState<DiscoverySettings>({
    enabled: true,
    maxVideosPerSession: 20,
    minimumConfidence: 0.6,
    autoAddHighConfidence: true,
    discoveryInterval: 24
  });
  
  const [discoveredVideos, setDiscoveredVideos] = useState<DiscoveredVideo[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState(0);
  const [addedVideos, setAddedVideos] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  // Check for automatic discovery on load
  useEffect(() => {
    checkForAutomaticDiscovery();
  }, []);

  const checkForAutomaticDiscovery = async () => {
    try {
      const lastDiscovery = localStorage.getItem('lastVideoDiscovery');
      const now = Date.now();
      const interval = discoverySettings.discoveryInterval * 60 * 60 * 1000; // Convert to ms
      
      if (!lastDiscovery || (now - parseInt(lastDiscovery)) > interval) {
        if (discoverySettings.enabled) {
          toast({
            title: "Starting Automatic Discovery",
            description: "AI is searching for new videos based on your viewing history"
          });
          startDiscovery();
        }
      }
    } catch (error) {
      console.error('Error checking automatic discovery:', error);
    }
  };

  const discoverVideosMutation = useMutation({
    mutationFn: async () => {
      setIsDiscovering(true);
      setDiscoveryProgress(10);
      
      // Generate user profile
      const profileResponse = await apiRequest('/api/discovery/generate-profile', {
        method: 'POST',
      });
      setDiscoveryProgress(30);
      
      // Search internet for videos
      const discoveryResponse = await apiRequest('/api/discovery/search-videos', {
        method: 'POST',
        body: JSON.stringify({
          maxResults: discoverySettings.maxVideosPerSession,
          minimumConfidence: discoverySettings.minimumConfidence
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      setDiscoveryProgress(80);
      
      return discoveryResponse;
    },
    onSuccess: (data: any) => {
      const videos = data?.videos || [];
      setDiscoveredVideos(videos);
      setDiscoveryProgress(100);
      setIsDiscovering(false);
      
      // Auto-add high confidence videos
      if (discoverySettings.autoAddHighConfidence && videos.length > 0) {
        const highConfidenceVideos = videos.filter((video: DiscoveredVideo) => 
          video && video.confidence >= 0.8
        );
        
        if (highConfidenceVideos.length > 0) {
          highConfidenceVideos.forEach((video: DiscoveredVideo) => {
            addVideoToLibrary(video);
          });
          
          toast({
            title: "Videos Auto-Added!",
            description: `${highConfidenceVideos.length} high-confidence videos added to your library`
          });
        }
      }
      
      localStorage.setItem('lastVideoDiscovery', Date.now().toString());
      
      toast({
        title: "Discovery Complete!",
        description: `Found ${videos.length} recommended videos based on your viewing history`
      });
    },
    onError: (error: any) => {
      setIsDiscovering(false);
      setDiscoveryProgress(0);
      toast({
        title: "Discovery Failed",
        description: error.message || "Could not discover new videos",
        variant: "destructive"
      });
    }
  });

  const addVideoMutation = useMutation({
    mutationFn: async (video: DiscoveredVideo) => {
      return apiRequest('/api/discovery/add-video', {
        method: 'POST',
        body: JSON.stringify(video),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, video) => {
      setAddedVideos(prev => new Set([...prev, video.url]));
      toast({
        title: "Video Added!",
        description: `"${video.title}" has been added to your library`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Video",
        description: error.message || "Could not add video to library",
        variant: "destructive"
      });
    }
  });

  const startDiscovery = () => {
    discoverVideosMutation.mutate();
  };

  const addVideoToLibrary = (video: DiscoveredVideo) => {
    if (!addedVideos.has(video.url)) {
      addVideoMutation.mutate(video);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400 bg-green-400/10';
    if (confidence >= 0.6) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const getPlatformIcon = (platform: string) => {
    const icons: { [key: string]: string } = {
      'thisvid.com': '🎬',
      'pornhub.com': '🟠',
      'xvideos.com': '🔴',
      'redtube.com': '🔴',
      'xhamster.com': '🐹'
    };
    return icons[platform] || '📺';
  };

  return (
    <div className="space-y-6">
      {/* Discovery Header */}
      <Card className="masculine-card border-orange-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-orange-400" />
            AI-Powered Video Discovery
          </CardTitle>
          <CardDescription>
            Automatically discovers videos from across the internet based on your viewing history and preferences.
            No manual searching required - AI finds content you'll love.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Discovery Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <Globe className="h-6 w-6 mx-auto mb-1 text-blue-400" />
              <p className="text-xs text-zinc-400">Platforms Searched</p>
              <p className="text-lg font-bold text-blue-400">10+</p>
            </div>
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <Video className="h-6 w-6 mx-auto mb-1 text-green-400" />
              <p className="text-xs text-zinc-400">Videos Found</p>
              <p className="text-lg font-bold text-green-400">{discoveredVideos.length}</p>
            </div>
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <Plus className="h-6 w-6 mx-auto mb-1 text-orange-400" />
              <p className="text-xs text-zinc-400">Auto-Added</p>
              <p className="text-lg font-bold text-orange-400">{addedVideos.size}</p>
            </div>
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <Zap className="h-6 w-6 mx-auto mb-1 text-purple-400" />
              <p className="text-xs text-zinc-400">AI Powered</p>
              <p className="text-lg font-bold text-purple-400">24/7</p>
            </div>
          </div>

          {/* Discovery Controls */}
          <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Switch
                checked={discoverySettings.enabled}
                onCheckedChange={(enabled) => 
                  setDiscoverySettings(prev => ({ ...prev, enabled }))
                }
              />
              <div>
                <p className="font-medium text-zinc-200">Automatic Discovery</p>
                <p className="text-xs text-zinc-400">AI searches every {discoverySettings.discoveryInterval} hours</p>
              </div>
            </div>
            
            <Button
              onClick={startDiscovery}
              disabled={isDiscovering}
              className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
            >
              {isDiscovering ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Discover Now
                </>
              )}
            </Button>
          </div>

          {/* Discovery Progress */}
          {isDiscovering && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Searching the internet...</span>
                <span className="text-orange-400">{discoveryProgress}%</span>
              </div>
              <Progress value={discoveryProgress} className="h-2" />
              <p className="text-xs text-zinc-500 text-center">
                {discoveryProgress < 30 && "Analyzing your viewing history..."}
                {discoveryProgress >= 30 && discoveryProgress < 80 && "Searching multiple adult platforms..."}
                {discoveryProgress >= 80 && "Processing results and scoring confidence..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discovery Settings */}
      <Card className="masculine-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-400" />
            Discovery Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Videos per Session</label>
              <select
                value={discoverySettings.maxVideosPerSession}
                onChange={(e) => setDiscoverySettings(prev => ({ 
                  ...prev, 
                  maxVideosPerSession: parseInt(e.target.value) 
                }))}
                className="w-full p-2 bg-zinc-800 border border-zinc-600 rounded text-zinc-200"
              >
                <option value={10}>10 videos</option>
                <option value={20}>20 videos</option>
                <option value={50}>50 videos</option>
                <option value={100}>100 videos</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Minimum Confidence</label>
              <select
                value={discoverySettings.minimumConfidence}
                onChange={(e) => setDiscoverySettings(prev => ({ 
                  ...prev, 
                  minimumConfidence: parseFloat(e.target.value) 
                }))}
                className="w-full p-2 bg-zinc-800 border border-zinc-600 rounded text-zinc-200"
              >
                <option value={0.3}>30% - Show all results</option>
                <option value={0.5}>50% - Balanced quality</option>
                <option value={0.6}>60% - Good matches</option>
                <option value={0.8}>80% - High confidence only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded">
            <div>
              <p className="font-medium text-zinc-200">Auto-add High Confidence Videos</p>
              <p className="text-xs text-zinc-400">Automatically add videos with 80%+ confidence to your library</p>
            </div>
            <Switch
              checked={discoverySettings.autoAddHighConfidence}
              onCheckedChange={(checked) => 
                setDiscoverySettings(prev => ({ ...prev, autoAddHighConfidence: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Discovered Videos */}
      {discoveredVideos.length > 0 && (
        <Card className="masculine-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-400" />
                Discovered Videos
              </span>
              <Badge variant="secondary">{discoveredVideos.length} found</Badge>
            </CardTitle>
            <CardDescription>
              AI-discovered videos based on your viewing patterns and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {discoveredVideos.map((video, index) => (
                <div key={index} className="border border-zinc-700 rounded-lg p-4 hover:border-orange-500/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-zinc-200 truncate" title={video.title}>
                        {video.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs">{getPlatformIcon(video.platform)}</span>
                        <span className="text-xs text-zinc-500">{video.platform}</span>
                        {video.duration && (
                          <>
                            <Clock className="h-3 w-3 text-zinc-500" />
                            <span className="text-xs text-zinc-500">{video.duration}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={getConfidenceColor(video.confidence)}>
                        {Math.round(video.confidence * 100)}%
                      </Badge>
                      
                      {addedVideos.has(video.url) ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addVideoToLibrary(video)}
                          disabled={addVideoMutation.isPending}
                          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-zinc-400 mb-2">{video.reasoning}</p>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {video.category}
                    </Badge>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Original
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isDiscovering && discoveredVideos.length === 0 && (
        <Card className="masculine-card">
          <CardContent className="text-center py-12">
            <Brain className="h-12 w-12 mx-auto mb-4 text-zinc-500" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No Videos Discovered Yet</h3>
            <p className="text-zinc-400 mb-4">
              Click "Discover Now" to let AI search the internet for videos based on your viewing history
            </p>
            <Button
              onClick={startDiscovery}
              className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start AI Discovery
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}