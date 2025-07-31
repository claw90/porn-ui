import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Globe, 
  Zap, 
  Plus, 
  Play, 
  Star, 
  Eye, 
  Clock,
  Download,
  Settings,
  RefreshCw,
  Brain,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Users,
  Heart,
  Filter,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscoveredVideo {
  title: string;
  url: string;
  platform: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  views?: string;
  rating?: number;
  tags: string[];
  confidence: number;
  reason: string;
  addedToLibrary?: boolean;
}

interface UserProfile {
  preferredCategories: string[];
  preferredTags: string[];
  viewingPatterns: {
    timeOfDay: string[];
    averageWatchTime: number;
  };
  personalityTraits: string[];
}

interface DiscoveryStats {
  totalVideosInLibrary: number;
  videosDiscoveredLast30Days: number;
  platformsSearched: number;
  averageConfidence: number;
  autoAddedVideos: number;
}

const platforms = [
  { id: 'thisvid', name: 'ThisVid', icon: '🔥', color: 'orange' },
  { id: 'pornhub', name: 'PornHub', icon: '🔞', color: 'yellow' },
  { id: 'xvideos', name: 'XVideos', icon: '❌', color: 'red' },
  { id: 'redtube', name: 'RedTube', icon: '🔴', color: 'red' },
  { id: 'xhamster', name: 'XHamster', icon: '🐹', color: 'orange' },
  { id: 'beeg', name: 'Beeg', icon: '🐝', color: 'yellow' },
  { id: 'tube8', name: 'Tube8', icon: '8️⃣', color: 'green' },
  { id: 'spankbang', name: 'SpankBang', icon: '💥', color: 'purple' },
  { id: 'youporn', name: 'YouPorn', icon: '🎬', color: 'blue' },
  { id: 'drtuber', name: 'DrTuber', icon: '👨‍⚕️', color: 'blue' }
];

export default function Discovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['thisvid', 'pornhub', 'xvideos']);
  const [isSearching, setIsSearching] = useState(false);
  const [isAutoDiscovering, setIsAutoDiscovering] = useState(false);
  const [searchResults, setSearchResults] = useState<DiscoveredVideo[]>([]);
  const [autoDiscoveryResults, setAutoDiscoveryResults] = useState<DiscoveredVideo[]>([]);
  const [searchProgress, setSearchProgress] = useState(0);
  const [addedVideos, setAddedVideos] = useState<Set<string>>(new Set());

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await fetch('/api/discovery/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo-user' })
      });
      if (!response.ok) throw new Error('Failed to generate profile');
      const data = await response.json();
      return data.profile;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['discovery-stats'],
    queryFn: async () => {
      const response = await fetch('/api/discovery/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchProgress(0);
    setSearchResults([]);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSearchProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const response = await fetch('/api/search/internet-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          platforms: selectedPlatforms,
          maxResults: 50
        })
      });
      
      clearInterval(progressInterval);
      setSearchProgress(100);
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAutoDiscovery = async () => {
    setIsAutoDiscovering(true);
    setAutoDiscoveryResults([]);
    
    try {
      const response = await fetch('/api/discovery/search-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxResults: 20,
          minimumConfidence: 0.6
        })
      });
      
      if (!response.ok) throw new Error('Auto-discovery failed');
      
      const data = await response.json();
      setAutoDiscoveryResults(data.videos || []);
    } catch (error) {
      console.error('Auto-discovery error:', error);
    } finally {
      setIsAutoDiscovering(false);
    }
  };

  const handleAddToLibrary = async (video: DiscoveredVideo) => {
    try {
      const response = await fetch('/api/discovery/add-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: video.title,
          videoUrl: video.url,
          tags: video.tags,
          categories: ['discovered'],
          platform: video.platform
        })
      });
      
      if (response.ok) {
        setAddedVideos(prev => new Set([...prev, video.url]));
      } else {
        const error = await response.json();
        console.error('Failed to add video:', error);
      }
    } catch (error) {
      console.error('Error adding video:', error);
    }
  };

  const seedSampleVideos = async () => {
    try {
      const response = await fetch('/api/videos/seed-samples', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Added ${data.addedCount} sample videos to your library!`);
      }
    } catch (error) {
      console.error('Error seeding sample videos:', error);
    }
  };

  const VideoCard = ({ video, showAddButton = true }: { video: DiscoveredVideo; showAddButton?: boolean }) => {
    const isAdded = addedVideos.has(video.url) || video.addedToLibrary;
    
    return (
      <Card className="group bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700 hover:border-orange-500/50 transition-all duration-300 overflow-hidden">
        <div className="relative">
          {video.thumbnail ? (
            <img 
              src={`/api/thumbnails/placeholder?platform=${video.platform}&category=${video.tags[0] || 'video'}`}
              alt={video.title}
              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-32 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-xs">{video.platform.toUpperCase()}</div>
              </div>
            </div>
          )}
          
          {/* Platform badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-500/90 text-white text-xs">
              {platforms.find(p => p.id === video.platform)?.icon} {video.platform.toUpperCase()}
            </Badge>
          </div>
          
          {/* Confidence score */}
          <div className="absolute top-2 right-2">
            <Badge className={cn(
              "text-xs",
              video.confidence >= 0.8 ? "bg-green-500/90 text-white" :
              video.confidence >= 0.6 ? "bg-yellow-500/90 text-white" :
              "bg-red-500/90 text-white"
            )}>
              <Sparkles className="w-3 h-3 mr-1" />
              {Math.round(video.confidence * 100)}%
            </Badge>
          </div>
          
          {/* Added indicator */}
          {isAdded && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-green-500/90 text-white text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Added
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2">
            {video.title}
          </h3>
          
          {/* Reason */}
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            {video.reason}
          </p>
          
          {/* Tags */}
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {video.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs text-slate-400 border-slate-600">
                  {tag}
                </Badge>
              ))}
              {video.tags.length > 3 && (
                <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                  +{video.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(video.url, '_blank')}
              className="flex-1 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Watch
            </Button>
            {showAddButton && !isAdded && (
              <Button
                size="sm"
                onClick={() => handleAddToLibrary(video)}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const StatCard = ({ icon: Icon, title, value, description, color = "orange" }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    description: string;
    color?: string;
  }) => (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`bg-${color}-500/20 p-2 rounded-lg`}>
            <Icon className={`w-4 h-4 text-${color}-400`} />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-white text-sm">{title}</h4>
            <p className={`text-${color}-300 font-semibold text-lg`}>{value}</p>
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
            <Globe className="w-8 h-8 text-orange-400" />
            Video Discovery
          </h1>
          <p className="text-slate-400">
            Discover new content from across the internet with AI-powered matching
          </p>
        </div>

        {/* Discovery Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              icon={Eye}
              title="Library Size"
              value={stats.totalVideosInLibrary}
              description="Total videos in collection"
            />
            <StatCard
              icon={TrendingUp}
              title="Recently Found"
              value={stats.videosDiscoveredLast30Days}
              description="New videos this month"
              color="green"
            />
            <StatCard
              icon={Globe}
              title="Platforms"
              value={stats.platformsSearched}
              description="Sources searched"
              color="blue"
            />
            <StatCard
              icon={Target}
              title="Match Quality"
              value={`${Math.round(stats.averageConfidence * 100)}%`}
              description="Average confidence"
              color="purple"
            />
            <StatCard
              icon={Zap}
              title="Auto-Added"
              value={stats.autoAddedVideos}
              description="High confidence matches"
              color="yellow"
            />
          </div>
        )}

        <Tabs defaultValue="auto" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="auto" className="data-[state=active]:bg-orange-600">
              <Brain className="w-4 h-4 mr-2" />
              Auto Discovery
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-orange-600">
              <Search className="w-4 h-4 mr-2" />
              Manual Search
            </TabsTrigger>
            <TabsTrigger value="test" className="data-[state=active]:bg-orange-600">
              <Zap className="w-4 h-4 mr-2" />
              Test Discovery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto" className="space-y-6">
            {/* Auto Discovery */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-orange-400" />
                  AI-Powered Auto Discovery
                </CardTitle>
                <p className="text-slate-400 text-sm">
                  Let AI analyze your preferences and automatically find matching content
                </p>
              </CardHeader>
              <CardContent>
                {profile && (
                  <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Your AI Profile</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Top Categories:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {profile.preferredCategories.slice(0, 3).map((cat: string, index: number) => (
                            <Badge key={index} className="bg-orange-500/20 text-orange-300 text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Preferred Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {profile.preferredTags.slice(0, 4).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-slate-300 border-slate-600 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Style:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {profile.personalityTraits.slice(0, 2).map((trait: string, index: number) => (
                            <Badge key={index} className="bg-purple-500/20 text-purple-300 text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={handleAutoDiscovery}
                  disabled={isAutoDiscovering}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Brain className={cn("w-4 h-4 mr-2", isAutoDiscovering && "animate-pulse")} />
                  {isAutoDiscovering ? 'Discovering Videos...' : 'Start Auto Discovery'}
                </Button>
              </CardContent>
            </Card>

            {/* Auto Discovery Results */}
            {autoDiscoveryResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">
                    Discovered {autoDiscoveryResults.length} videos for you
                  </h3>
                  <Badge className="bg-green-500/20 text-green-300">
                    High confidence matches
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {autoDiscoveryResults.map((video, index) => (
                    <VideoCard key={index} video={video} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            {/* Manual Search */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-orange-400" />
                  Manual Search
                </CardTitle>
                <p className="text-slate-400 text-sm">
                  Search specific platforms for content with custom keywords
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for videos (e.g., 'muscle guys', 'bear daddy', 'twink college')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border-slate-600 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                  />
                  <Button
                    onClick={handleManualSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
                
                {/* Platform Selection */}
                <div>
                  <h4 className="text-white font-medium mb-2">Search Platforms:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {platforms.map((platform) => (
                      <label key={platform.id} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPlatforms([...selectedPlatforms, platform.id]);
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                            }
                          }}
                        />
                        <span className="text-sm text-white">
                          {platform.icon} {platform.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Progress */}
                {isSearching && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Searching platforms...</span>
                      <span className="text-slate-400">{searchProgress}%</span>
                    </div>
                    <Progress value={searchProgress} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">
                    Found {searchResults.length} videos
                  </h3>
                  <Badge className="bg-blue-500/20 text-blue-300">
                    Search results for "{searchQuery}"
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {searchResults.map((video, index) => (
                    <VideoCard key={index} video={video} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            {/* Test Discovery */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-400" />
                  Test Discovery System
                </CardTitle>
                <p className="text-slate-400 text-sm">
                  Try the discovery system with sample videos to see how it works
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="text-white font-medium mb-2">What this does:</h4>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>• Adds 5 sample videos to your library</li>
                      <li>• Demonstrates different content categories (muscle, twink, bear, etc.)</li>
                      <li>• Shows how the AI analyzes and categorizes content</li>
                      <li>• Helps train the recommendation algorithm</li>
                    </ul>
                  </div>
                  
                  <Button
                    onClick={seedSampleVideos}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Add Sample Videos to Library
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
