import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Clock, Star, ExternalLink, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  platform: string;
  thumbnail?: string;
  duration?: string;
  description?: string;
  tags: string[];
  confidence: number;
}

// Thumbnail component that handles both real images and SVG fallbacks
function ThumbnailImage({ video }: { video: SearchResult }) {
  const generateSVGThumbnail = () => {
    const platformColor = video.platform === 'thisvid' ? '#FF6B35' : 
                         video.platform === 'pornhub' ? '#FF9000' : 
                         video.platform === 'xvideos' ? '#E50000' : '#666666';
    
    const svgData = `
      <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg-${video.id}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${platformColor};stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:0.9" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg-${video.id})"/>
        <circle cx="160" cy="90" r="30" fill="rgba(255,255,255,0.9)"/>
        <polygon points="150,75 150,105 175,90" fill="${platformColor}"/>
        <text x="160" y="140" font-family="Arial" font-size="14" fill="white" text-anchor="middle">${video.platform.toUpperCase()}</text>
        <text x="160" y="155" font-family="Arial" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">${video.duration || 'Video'}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  // Try to load real thumbnail first, fallback to SVG
  return (
    <img 
      src={video.thumbnail || generateSVGThumbnail()}
      alt={video.title}
      className="w-full h-full object-cover"
      onError={(e) => {
        // If thumbnail fails to load, use SVG fallback
        const target = e.target as HTMLImageElement;
        if (target.src !== generateSVGThumbnail()) {
          target.src = generateSVGThumbnail();
        }
      }}
    />
  );
}

export function InternetVideoSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get recommended tags for the search suggestions
  const { data: recommendedTags = [] } = useQuery<string[]>({
    queryKey: ["/api/search/recommended-tags"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/search/recommended-tags?userId=demo-user");
        const data = await res.json();
        return data.tags || [];
      } catch (error) {
        console.error("Error fetching recommended tags:", error);
        return [];
      }
    }
  });

  // Get popular tags as fallback suggestions
  const { data: popularTags = [] } = useQuery<string[]>({
    queryKey: ["/api/search/popular-tags"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/search/popular-tags");
        const data = await res.json();
        return data.tags || [];
      } catch (error) {
        console.error("Error fetching popular tags:", error);
        return ['muscle', 'bear', 'twink', 'daddy', 'jock', 'amateur', 'bareback'];
      }
    }
  });

  // Get search history for quick access
  const { data: searchHistoryData = [] } = useQuery<string[]>({
    queryKey: ["/api/search/history"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/search/history?userId=demo-user");
        const data = await res.json();
        return data.history?.map((h: any) => h.query) || [];
      } catch (error) {
        console.error("Error fetching search history:", error);
        return [];
      }
    }
  });

  // Remove duplicates from search history
  const searchHistory = Array.from(new Set(searchHistoryData));

  // Search for videos
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch("/api/search/internet-videos", {
        method: "POST",
        body: JSON.stringify({
          query,
          userId: "demo-user",
          maxResults: 30
        }),
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    },
    onSuccess: (results) => {
      setSearchResults(results);
      setIsSearching(false);
      
      // Update search history and recommendations  
      if (searchQuery && searchQuery.trim()) {
        apiRequest("/api/search/history", {
          method: "POST",
          body: JSON.stringify({
            query: searchQuery,
            userId: "demo-user"
          }),
          headers: { "Content-Type": "application/json" }
        });
      }
      
      if (searchQuery && searchQuery.trim()) {
        apiRequest("/api/search/update-recommendations", {
          method: "POST",
          body: JSON.stringify({
            query: searchQuery,
            userId: "demo-user"
          }),
          headers: { "Content-Type": "application/json" }
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/search/recommended-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search/history"] });
    },
    onError: (error) => {
      console.error("Search error:", error);
      setIsSearching(false);
      toast({
        title: "Search Failed",
        description: "Unable to search for videos. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add video to collection
  const addVideoMutation = useMutation({
    mutationFn: async (videoData: SearchResult) => {
      return apiRequest("/api/videos/url", {
        method: "POST",
        body: JSON.stringify({
          videoUrl: videoData.url,
          title: videoData.title,
          tags: videoData.tags,
          categories: ["discovered"],
          performers: [],
          isExternal: true
        }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      toast({
        title: "Video Added",
        description: "Video successfully added to your collection!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Video",
        description: "This video might already be in your collection.",
        variant: "destructive",
      });
    }
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    searchMutation.mutate(searchQuery);
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
  };

  const handleAddVideo = (video: SearchResult) => {
    addVideoMutation.mutate(video);
  };

  const allSuggestions = [
    ...(recommendedTags || []).slice(0, 8), 
    ...(popularTags || []).slice(0, 6)
  ];
  const uniqueSuggestions = Array.from(new Set(allSuggestions)).slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">Find New Videos</h1>
        <p className="text-gray-400">Search the internet for videos that match your taste</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 max-w-2xl mx-auto">
        <Input
          placeholder="Search for videos (e.g., 'muscle bear', 'amateur twink', 'bareback')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
        />
        <Button 
          onClick={handleSearch} 
          disabled={!searchQuery.trim() || isSearching}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Search className="w-4 h-4 mr-2" />
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>



      {/* Recent Searches */}
      {searchHistory.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 6).map((query, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  onClick={() => handleTagClick(query)}
                >
                  {query}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Search Results ({searchResults.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((video) => (
              <Card key={video.id} className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                      <img
                        src={`data:image/svg+xml;base64,${btoa(`
                          <svg width="240" height="135" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#${video.platform?.includes('thisvid') ? 'FF6B35' : video.platform?.includes('pornhub') ? 'FFA500' : video.platform?.includes('xvideos') ? 'FF0000' : '6B46C1'};stop-opacity:0.8" />
                                <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
                              </linearGradient>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grad)"/>
                            <circle cx="120" cy="67.5" r="20" fill="rgba(255,255,255,0.9)"/>
                            <polygon points="112,58 112,77 132,67.5" fill="#1a1a1a"/>
                            <text x="120" y="105" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">${video.platform?.toUpperCase() || 'VIDEO'}</text>
                            <text x="120" y="120" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="10">${(video.confidence * 100).toFixed(0)}% Match</text>
                          </svg>
                        `)}`}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-white text-sm line-clamp-2">{video.title}</h3>
                      
                      {/* Platform and Confidence */}
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className="border-gray-600 text-gray-400">
                          {video.platform}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="text-gray-400">{(video.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {video.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddVideo(video)}
                          disabled={addVideoMutation.isPending}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to Collection
                        </Button>
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
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                          title={video.url.includes('thisvid.com') ? 'Login & Watch' : 'Play Video'}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">No videos found for "{searchQuery}". Try different search terms.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}