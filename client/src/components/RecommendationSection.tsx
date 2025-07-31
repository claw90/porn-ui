import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { apiRequest } from "@/lib/queryClient";
import { 
  Play, 
  Heart, 
  Eye, 
  Clock, 
  Star,
  Zap,
  TrendingUp,
  Users,
  Target,
  Shuffle
} from "lucide-react";

interface VideoRecommendation {
  id: string;
  title: string;
  thumbnailPath?: string;
  duration?: number;
  viewCount?: number;
  rating?: number;
  tags?: string[];
  performers?: string[];
  isBookmarked?: boolean;
  isFavorite?: boolean;
  score: number;
  reason: string;
  algorithm: string;
  createdAt?: string;
}

interface RecommendationSectionProps {
  videos?: any[];
  onVideoSelect?: (video: any) => void;
  selectedVideoUrl?: string;
  userId?: string;
  className?: string;
}

export default function RecommendationSection({ 
  videos = [], 
  onVideoSelect, 
  selectedVideoUrl,
  userId = "demo-user", 
  className = "" 
}: RecommendationSectionProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'hybrid' | 'collaborative' | 'content' | 'trending'>('hybrid');
  const queryClient = useQueryClient();

  // Fetch recommendations
  const { data: recommendations = [], isLoading, refetch } = useQuery<VideoRecommendation[]>({
    queryKey: ['/api/recommendations', userId, selectedAlgorithm],
  });

  // Record interaction mutation
  const recordInteraction = useMutation({
    mutationFn: async (data: {
      userId: string;
      videoId: string;
      watchDuration: number;
      completionPercentage: number;
      rating?: number;
    }) => {
      const response = await fetch('/api/recommendations/interaction', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    }
  });

  const handleVideoClick = (video: VideoRecommendation) => {
    // Use the passed onVideoSelect function if available
    if (onVideoSelect) {
      onVideoSelect(video);
    }
    // Simulate video interaction
    recordInteraction.mutate({
      userId,
      videoId: video.id,
      watchDuration: 120, // 2 minutes
      completionPercentage: 50,
      rating: 4
    });
  };

  const getAlgorithmIcon = (algorithm: string) => {
    switch (algorithm) {
      case 'collaborative': return <Users className="w-4 h-4" />;
      case 'content': return <Target className="w-4 h-4" />;
      case 'trending': return <TrendingUp className="w-4 h-4" />;
      case 'hybrid': return <Zap className="w-4 h-4" />;
      default: return <Shuffle className="w-4 h-4" />;
    }
  };

  const getAlgorithmColor = (algorithm: string) => {
    switch (algorithm) {
      case 'collaborative': return 'bg-blue-500/20 text-blue-400';
      case 'content': return 'bg-green-500/20 text-green-400';
      case 'trending': return 'bg-red-500/20 text-red-400';
      case 'hybrid': return 'bg-primary/20 text-primary';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">

      {/* Video Library Integration */}
      {videos && videos.length > 0 && (
        <Card className="masculine-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Your Video Library ({videos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {videos.slice(0, 12).map((video: any) => (
                <div
                  key={video.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedVideoUrl === video.videoUrl ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onVideoSelect?.(video)}
                >
                  <div className="space-y-2">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 rounded border border-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors relative overflow-hidden group">
                      {video.isExternal && video.videoUrl ? (
                        <>
                          <img 
                            src={`data:image/svg+xml;base64,${btoa(`
                              <svg width="160" height="90" xmlns="http://www.w3.org/2000/svg">
                                <rect width="100%" height="100%" fill="#1a1a1a"/>
                                <circle cx="80" cy="45" r="20" fill="#ff6b1a" opacity="0.8"/>
                                <polygon points="72,35 72,55 88,45" fill="white"/>
                                <text x="80" y="70" text-anchor="middle" fill="#999" font-size="8" font-family="Arial">${video.videoUrl.includes('thisvid.com') ? 'ThisVid' : 'Video'}</text>
                              </svg>
                            `)}`}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Play className="h-6 w-6 text-primary" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <Play className="h-8 w-8 text-white" />
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-medium truncate text-foreground">
                        {video.title === 'External Video' && video.videoUrl ? 
                          (() => {
                            try {
                              const url = new URL(video.videoUrl);
                              const pathSegments = url.pathname.split('/').filter(Boolean);
                              if (pathSegments.length > 0) {
                                const lastSegment = pathSegments[pathSegments.length - 1];
                                return lastSegment.replace(/[-_]/g, ' ').substring(0, 25) + '...';
                              }
                              return url.hostname.replace('www.', '') + ' Video';
                            } catch {
                              return 'External Video';
                            }
                          })() : 
                          (video.title?.substring(0, 25) + (video.title?.length > 25 ? '...' : ''))
                        }
                      </h4>
                      <div className="flex items-center gap-1 mt-1">
                        {video.isExternal && (
                          <Badge variant="secondary" className="text-xs h-4 px-1">URL</Badge>
                        )}
                        {video.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-2 w-2 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs text-muted-foreground">{video.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personalized Recommendations */}
      <Card className={`masculine-card border-primary/10 ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl masculine-text-gradient flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary glow-secondary" />
              AI-Powered Recommendations
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="hover-glow border-primary/30"
              disabled={isLoading}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      
      <CardContent>
        {/* Algorithm Selection */}
        <Tabs value={selectedAlgorithm} onValueChange={(value) => setSelectedAlgorithm(value as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 bg-black/40">
            <TabsTrigger value="hybrid" className="data-[state=active]:masculine-gradient">
              <Zap className="w-4 h-4 mr-2" />
              Smart
            </TabsTrigger>
            <TabsTrigger value="collaborative" className="data-[state=active]:masculine-gradient">
              <Users className="w-4 h-4 mr-2" />
              Similar Users
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:masculine-gradient">
              <Target className="w-4 h-4 mr-2" />
              Content Match
            </TabsTrigger>
            <TabsTrigger value="trending" className="data-[state=active]:masculine-gradient">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedAlgorithm} className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted/20 rounded-lg h-40 mb-3"></div>
                    <div className="bg-muted/20 h-4 rounded mb-2"></div>
                    <div className="bg-muted/20 h-3 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-4 text-primary/50" />
                <p>No recommendations available yet.</p>
                <p className="text-sm">Watch more videos to get personalized suggestions!</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.map((video: VideoRecommendation) => (
                    <Card
                      key={video.id}
                      className="group cursor-pointer hover-glow border-primary/10 transition-all duration-300"
                      onClick={() => handleVideoClick(video)}
                    >
                      <div className="relative">
                        <img
                          src={video.thumbnailPath || "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=225&fit=crop"}
                          alt={video.title}
                          className="w-full h-32 object-cover rounded-t-lg thumbnail-hover"
                        />
                        
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                          <Play className="w-8 h-8 text-white" />
                        </div>

                        {/* Duration badge */}
                        {video.duration && (
                          <div className="absolute bottom-2 right-2 masculine-gradient text-white text-xs px-2 py-1 rounded-md font-medium">
                            {formatDuration(video.duration)}
                          </div>
                        )}

                        {/* Favorite indicator */}
                        {video.isFavorite && (
                          <div className="absolute top-2 left-2">
                            <Heart className="w-4 h-4 fill-primary text-primary" />
                          </div>
                        )}

                        {/* Algorithm badge */}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs flex items-center gap-1 ${getAlgorithmColor(video.algorithm)}`}>
                          {getAlgorithmIcon(video.algorithm)}
                          <span className="capitalize">{video.algorithm}</span>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-medium text-sm leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {video.title}
                        </h3>

                        {/* Recommendation reason */}
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {video.reason}
                        </p>

                        {/* Video stats */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-3">
                            {video.viewCount && (
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span>{video.viewCount}</span>
                              </div>
                            )}
                            {video.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-primary text-primary" />
                                <span>{video.rating}/5</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Confidence score */}
                          <div className="flex items-center gap-1 text-primary">
                            <span className="font-medium">{Math.round(video.score * 100)}%</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {video.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                            {video.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{video.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </div>
  );
}