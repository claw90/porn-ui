import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Heart, 
  Play, 
  Star, 
  Eye, 
  RefreshCw,
  Settings,
  Brain,
  Target,
  ThumbsUp,
  Clock,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Video {
  id: string;
  title: string;
  videoUrl?: string;
  thumbnailPath?: string;
  duration?: number;
  viewCount: number;
  rating: number;
  tags: string[];
  performers: string[];
  categories: string[];
  isBookmarked: boolean;
  isFavorite: boolean;
  isExternal: boolean;
  createdAt: string;
}

interface Recommendation {
  video: Video;
  score: number;
  reason: string;
  algorithm: string;
  confidence: number;
}

interface UserProfile {
  preferredCategories: string[];
  preferredTags: string[];
  preferredPerformers: string[];
  viewingPatterns: {
    timeOfDay: string[];
    dayOfWeek: string[];
    averageWatchTime: number;
  };
  personalityTraits: string[];
}

export default function Recommendations() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'hybrid' | 'collaborative' | 'content' | 'trending'>('hybrid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const userId = 'demo-user'; // In production, get from auth context

  const { data: recommendations = [], isLoading, refetch } = useQuery({
    queryKey: ['recommendations', userId, selectedAlgorithm],
    queryFn: async () => {
      const response = await fetch(`/api/recommendations/${userId}?algorithm=${selectedAlgorithm}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      // Generate user profile from viewing history
      const response = await fetch('/api/discovery/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to generate profile');
      const data = await response.json();
      return data.profile;
    },
  });

  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    }
  }, [profile]);

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      await refetch();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVideoInteraction = async (videoId: string, action: 'like' | 'dislike' | 'watch') => {
    try {
      await fetch('/api/recommendations/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          videoId,
          watchDuration: action === 'watch' ? 300 : 0, // 5 minutes if watched
          completionPercentage: action === 'watch' ? 0.8 : 0,
          rating: action === 'like' ? 5 : action === 'dislike' ? 1 : undefined
        })
      });
      
      // Refresh recommendations after interaction
      await refetch();
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  };

  const openVideo = (video: Video) => {
    if (video.videoUrl) {
      if (video.videoUrl.includes('thisvid.com') || video.videoUrl.includes('pornhub.com')) {
        window.location.href = video.videoUrl;
      } else {
        window.open(video.videoUrl, '_blank');
      }
      
      // Record interaction
      handleVideoInteraction(video.id, 'watch');
    }
  };

  const RecommendationCard = ({ recommendation }: { recommendation: Recommendation }) => {
    const { video, score, reason, algorithm, confidence } = recommendation;
    const [thumbnailError, setThumbnailError] = useState(false);
    
    return (
      <Card className="group bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700 hover:border-orange-500/50 transition-all duration-300 overflow-hidden">
        <div className="relative">
          {!thumbnailError ? (
            <img 
              src={`/api/videos/${video.id}/thumbnail`}
              alt={video.title}
              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setThumbnailError(true)}
            />
          ) : (
            <div className="w-full h-32 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <Play className="w-8 h-8 text-slate-400 opacity-50" />
            </div>
          )}
          
          {/* Algorithm badge */}
          <div className="absolute top-2 left-2">
            <Badge className={cn(
              "text-xs",
              algorithm === 'hybrid' ? "bg-purple-500/90 text-white" :
              algorithm === 'collaborative' ? "bg-blue-500/90 text-white" :
              algorithm === 'content' ? "bg-green-500/90 text-white" :
              "bg-red-500/90 text-white"
            )}>
              {algorithm === 'hybrid' ? <Brain className="w-3 h-3 mr-1" /> :
               algorithm === 'collaborative' ? <Users className="w-3 h-3 mr-1" /> :
               algorithm === 'content' ? <Target className="w-3 h-3 mr-1" /> :
               <TrendingUp className="w-3 h-3 mr-1" />}
              {algorithm.charAt(0).toUpperCase() + algorithm.slice(1)}
            </Badge>
          </div>
          
          {/* Confidence score */}
          <div className="absolute top-2 right-2">
            <Badge className="bg-black/80 text-white text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              {Math.round(confidence * 100)}%
            </Badge>
          </div>
          
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              onClick={() => openVideo(video)}
              className="bg-orange-500/90 hover:bg-orange-600/90 rounded-full p-3"
            >
              <Play className="w-5 h-5 text-white fill-white" />
            </Button>
          </div>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-orange-300 transition-colors cursor-pointer"
              onClick={() => openVideo(video)}>
            {video.title}
          </h3>
          
          {/* Recommendation reason */}
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            {reason}
          </p>
          
          {/* Tags */}
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {video.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs text-slate-400 border-slate-600">
                  {tag}
                </Badge>
              ))}
              {video.tags.length > 2 && (
                <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                  +{video.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
          
          {/* Stats and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {video.viewCount}
              </div>
              {video.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  {video.rating}
                </div>
              )}
            </div>
            
            {/* Quick actions */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleVideoInteraction(video.id, 'like')}
                className="h-6 w-6 p-0 text-slate-400 hover:text-green-400"
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleVideoInteraction(video.id, 'dislike')}
                className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
              >
                <Heart className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Confidence bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Match Score</span>
              <span>{Math.round(score * 100)}%</span>
            </div>
            <Progress value={score * 100} className="h-1" />
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProfileInsight = ({ icon: Icon, title, value, description }: { 
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string;
    description: string;
  }) => (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-orange-500/20 p-2 rounded-lg">
            <Icon className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-white text-sm">{title}</h4>
            <p className="text-orange-300 font-semibold text-lg">{value}</p>
            <p className="text-slate-400 text-xs mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-orange-400" />
            AI Recommendations
          </h1>
          <p className="text-slate-400">
            Personalized video suggestions powered by advanced machine learning algorithms
          </p>
        </div>

        <Tabs defaultValue="recommendations" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-orange-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-orange-600">
              <Settings className="w-4 h-4 mr-2" />
              Your Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-6">
            {/* Algorithm Selection */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-orange-400" />
                  Recommendation Algorithm
                </CardTitle>
                <p className="text-slate-400 text-sm">
                  Choose how you want recommendations to be generated
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    {
                      key: 'hybrid' as const,
                      icon: Brain,
                      title: 'Hybrid AI',
                      description: 'Best of all algorithms combined',
                      color: 'purple'
                    },
                    {
                      key: 'collaborative' as const,
                      icon: Users,
                      title: 'User-Based',
                      description: 'Based on similar users',
                      color: 'blue'
                    },
                    {
                      key: 'content' as const,
                      icon: Target,
                      title: 'Content-Based',
                      description: 'Based on video attributes',
                      color: 'green'
                    },
                    {
                      key: 'trending' as const,
                      icon: TrendingUp,
                      title: 'Trending',
                      description: 'Popular right now',
                      color: 'red'
                    }
                  ].map((alg) => (
                    <button
                      key={alg.key}
                      onClick={() => setSelectedAlgorithm(alg.key)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all duration-200 text-left",
                        selectedAlgorithm === alg.key
                          ? `border-${alg.color}-500 bg-${alg.color}-500/10`
                          : "border-slate-600 hover:border-slate-500"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <alg.icon className={cn(
                          "w-5 h-5",
                          selectedAlgorithm === alg.key ? `text-${alg.color}-400` : "text-slate-400"
                        )} />
                        <span className="font-medium text-white">{alg.title}</span>
                      </div>
                      <p className="text-xs text-slate-400">{alg.description}</p>
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-slate-400">
                    {recommendations.length} recommendations available
                  </div>
                  <Button
                    onClick={handleGenerateRecommendations}
                    disabled={isGenerating}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
                    {isGenerating ? 'Generating...' : 'Refresh'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-slate-400 mt-4">Generating personalized recommendations...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardContent className="p-12 text-center">
                  <div className="text-slate-400 mb-4">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-white mb-2">No recommendations yet</h3>
                    <p>Watch some videos to help our AI learn your preferences and generate personalized recommendations.</p>
                  </div>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    Browse Library
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recommendations.map((recommendation: Recommendation, index: number) => (
                  <RecommendationCard key={index} recommendation={recommendation} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            {/* User Profile Insights */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-400" />
                  Your Viewing Profile
                </CardTitle>
                <p className="text-slate-400 text-sm">
                  AI analysis of your viewing patterns and preferences
                </p>
              </CardHeader>
            </Card>

            {userProfile ? (
              <>
                {/* Profile Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ProfileInsight
                    icon={Heart}
                    title="Top Category"
                    value={(userProfile.preferredCategories && userProfile.preferredCategories.length > 0) ? userProfile.preferredCategories[0] : 'Exploring'}
                    description="Your most watched category"
                  />
                  <ProfileInsight
                    icon={Clock}
                    title="Watch Time"
                    value={`${Math.round((userProfile.viewingPatterns?.averageWatchTime || 0) / 60)}m`}
                    description="Average session length"
                  />
                  <ProfileInsight
                    icon={Users}
                    title="Favorite Type"
                    value={(userProfile.personalityTraits && userProfile.personalityTraits.length > 0) ? userProfile.personalityTraits[0] : 'Varied'}
                    description="Preferred content style"
                  />
                  <ProfileInsight
                    icon={TrendingUp}
                    title="Activity"
                    value="High"
                    description="Viewing frequency"
                  />
                </div>

                {/* Detailed Preferences */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Preferred Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {userProfile.preferredCategories.slice(0, 10).map((category, index) => (
                          <Badge key={index} className="bg-orange-500/20 text-orange-300">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Favorite Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {userProfile.preferredTags.slice(0, 15).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-slate-300 border-slate-600">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Viewing Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Peak Hours</h4>
                        <div className="flex flex-wrap gap-1">
                          {userProfile.viewingPatterns.timeOfDay.map((time, index) => (
                            <Badge key={index} className="bg-blue-500/20 text-blue-300 text-xs">
                              {time}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-1">Active Days</h4>
                        <div className="flex flex-wrap gap-1">
                          {userProfile.viewingPatterns.dayOfWeek.map((day, index) => (
                            <Badge key={index} className="bg-green-500/20 text-green-300 text-xs">
                              {day}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Personality Traits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {userProfile.personalityTraits.map((trait, index) => (
                          <Badge key={index} className="bg-purple-500/20 text-purple-300">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-slate-400 mt-4">Analyzing your viewing profile...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
