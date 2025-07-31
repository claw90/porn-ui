import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wand2, Play, Star, Tag, ArrowRight, Shuffle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimilarVideo {
  id: string;
  title: string;
  videoUrl: string;
  tags: string;
  categories: string;
  performers: string;
  similarityScore: number;
  matchedFeatures: string[];
  reason: string;
}

interface SimilarVideosProps {
  videoId: string;
  currentVideo?: {
    title: string;
    tags?: string;
    categories?: string;
  };
  onVideoSelect?: (videoId: string) => void;
  showAutoPlay?: boolean;
}

export default function SimilarVideos({ 
  videoId, 
  currentVideo, 
  onVideoSelect,
  showAutoPlay = false 
}: SimilarVideosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch similar videos
  const { data: similarVideos, isLoading, error } = useQuery<SimilarVideo[]>({
    queryKey: ['/api/videos', videoId, 'similar'],
    queryFn: () => fetch(`/api/videos/${videoId}/similar?limit=8`).then(res => res.json()),
    enabled: !!videoId
  });

  // Analyze video mutation
  const analyzeVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/videos/${id}/analyze`, {
        method: 'POST'
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Video Analyzed",
        description: `AI analysis complete: ${data.analysis?.tags?.length || 0} tags generated`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos', videoId, 'similar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze video with AI. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Auto-tag all videos mutation
  const autoTagAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/videos/auto-tag-all', {
        method: 'POST'
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Auto-Tagging Complete",
        description: `Successfully analyzed and tagged ${data.taggedCount} videos`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    },
    onError: () => {
      toast({
        title: "Auto-Tagging Failed",
        description: "Unable to auto-tag videos. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAnalyzeVideo = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeVideoMutation.mutateAsync(videoId);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoTagAll = () => {
    autoTagAllMutation.mutate();
  };

  const handleVideoClick = (video: SimilarVideo) => {
    if (onVideoSelect) {
      onVideoSelect(video.id);
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score > 0.8) return "text-green-600 bg-green-50";
    if (score > 0.6) return "text-orange-600 bg-orange-50";
    return "text-blue-600 bg-blue-50";
  };

  const formatMatchedFeatures = (features: string[]) => {
    return features.map(feature => {
      const [type, value] = feature.split(':');
      return value || feature;
    }).slice(0, 3);
  };

  const hasMinimalTags = !currentVideo?.tags || 
    currentVideo.tags.trim().length === 0 || 
    currentVideo.tags === 'adult, video';

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>Unable to find similar videos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">AI Video Analysis</CardTitle>
            </div>
            {showAutoPlay && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shuffle className="h-4 w-4" />
                Auto-play similar videos
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {hasMinimalTags && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800 mb-1">
                      Better recommendations with AI analysis
                    </p>
                    <p className="text-sm text-orange-700 mb-3">
                      This video needs AI analysis to find accurate similar content
                    </p>
                    <Button
                      onClick={handleAnalyzeVideo}
                      disabled={isAnalyzing || analyzeVideoMutation.isPending}
                      size="sm"
                      className="masculine-gradient"
                    >
                      {(isAnalyzing || analyzeVideoMutation.isPending) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Analyze This Video
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Enhance your entire library with AI tagging</span>
              </div>
              <Button
                onClick={handleAutoTagAll}
                disabled={autoTagAllMutation.isPending}
                variant="outline"
                size="sm"
              >
                {autoTagAllMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                    Auto-tagging...
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-3 w-3" />
                    Auto-tag All Videos
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Similar Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-orange-500" />
            Similar Videos
            {similarVideos && similarVideos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {similarVideos.length} found
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : similarVideos && similarVideos.length > 0 ? (
            <div className="space-y-4">
              {similarVideos.map((video) => (
                <div
                  key={video.id}
                  className="group border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-orange-300"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail placeholder */}
                    <div className="w-32 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center group-hover:shadow-md transition-shadow">
                      <Play className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </div>
                    
                    {/* Video details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-orange-700 transition-colors">
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-2 ml-3">
                          <Badge className={`text-xs ${getSimilarityColor(video.similarityScore)}`}>
                            {Math.round(video.similarityScore * 100)}% match
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{video.reason}</p>
                      
                      {/* Matched features */}
                      {video.matchedFeatures && video.matchedFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {formatMatchedFeatures(video.matchedFeatures).map((feature, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Tags */}
                      {video.tags && (
                        <div className="text-xs text-gray-500">
                          Tags: {video.tags.split(',').slice(0, 4).join(', ')}
                          {video.tags.split(',').length > 4 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {showAutoPlay && similarVideos.length > 0 && (
                <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">Next Video Ready</p>
                      <p className="text-sm text-orange-700">
                        {similarVideos[0]?.title} will play automatically
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-2">No similar videos found</p>
              <p className="text-sm">
                {hasMinimalTags 
                  ? "Try analyzing this video first to get better recommendations"
                  : "This video has unique content"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}