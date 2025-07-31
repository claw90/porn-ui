import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BulkUrlImport from "@/components/BulkUrlImport";
import { 
  Search, 
  Grid, 
  List, 
  Filter,
  MoreVertical,
  Play,
  Star,
  Heart,
  Eye,
  Calendar,
  Clock,
  Tag,
  Users,
  Link,
  Download,
  Trash2,
  Edit,
  ExternalLink,
  Sparkles
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
  lastViewed?: string;
}

export default function Library() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  const { data: videos = [], isLoading, refetch } = useQuery({
    queryKey: ['videos', searchTerm, sortBy, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (sortBy !== 'recent') params.append('sort', sortBy);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      
      const response = await fetch(`/api/videos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      return response.json();
    },
  });

  const handleVideoAction = async (videoId: string, action: string) => {
    try {
      let response;
      switch (action) {
        case 'favorite':
          response = await fetch(`/api/videos/${videoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFavorite: true })
          });
          break;
        case 'bookmark':
          response = await fetch(`/api/videos/${videoId}/save`, {
            method: 'POST'
          });
          break;
        case 'delete':
          response = await fetch(`/api/videos/${videoId}`, {
            method: 'DELETE'
          });
          break;
        case 'analyze':
          response = await fetch(`/api/videos/${videoId}/analyze`, {
            method: 'POST'
          });
          break;
        case 'similar':
          // Navigate to similar videos view
          console.log('Find similar videos for:', videoId);
          break;
      }
      
      if (response?.ok) {
        refetch();
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const openVideo = (video: Video) => {
    if (video.videoUrl) {
      if (video.videoUrl.includes('thisvid.com') || video.videoUrl.includes('pornhub.com')) {
        // Authentication-required sites: open in same tab to maintain login
        window.location.href = video.videoUrl;
      } else {
        // Other sites: open in new tab
        window.open(video.videoUrl, '_blank');
      }
      
      // Log the view
      fetch(`/api/videos/${video.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 0,
          completed: false,
          userAgent: navigator.userAgent
        })
      }).catch(console.error);
    }
  };

  const VideoCard = ({ video }: { video: Video }) => {
    const [thumbnailError, setThumbnailError] = useState(false);
    
    return (
      <Card className="group bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700 hover:border-orange-500/50 transition-all duration-300 cursor-pointer overflow-hidden">
        <div className="relative">
          {!thumbnailError ? (
            <img 
              src={`/api/videos/${video.id}/thumbnail`}
              alt={video.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setThumbnailError(true)}
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div className="text-sm">Video Thumbnail</div>
              </div>
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
          
          {/* Top badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {video.isExternal && (
              <Badge className="bg-blue-500/90 text-white text-xs">
                <Link className="w-3 h-3 mr-1" />
                External
              </Badge>
            )}
            {video.categories.length > 0 && (
              <Badge className="bg-red-500/90 text-white text-xs">
                {video.categories[0]}
              </Badge>
            )}
          </div>
          
          {/* Duration badge */}
          {video.duration && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-black/80 text-white text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
              </Badge>
            </div>
          )}
          
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              onClick={() => openVideo(video)}
              className="bg-orange-500/90 hover:bg-orange-600/90 rounded-full p-4"
            >
              <Play className="w-6 h-6 text-white fill-white" />
            </Button>
          </div>
          
          {/* Action menu */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="bg-black/50 hover:bg-black/70 text-white">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'favorite')}>
                  <Star className="w-4 h-4 mr-2" />
                  Add to Favorites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'bookmark')}>
                  <Heart className="w-4 h-4 mr-2" />
                  Bookmark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'analyze')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Analyze
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'similar')}>
                  <Users className="w-4 h-4 mr-2" />
                  Find Similar
                </DropdownMenuItem>
                {video.videoUrl && (
                  <DropdownMenuItem onClick={() => window.open(video.videoUrl, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Original
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'delete')} className="text-red-400">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-orange-300 transition-colors">
            {video.title}
          </h3>
          
          {/* Tags */}
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
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
          
          {/* Performers */}
          {video.performers.length > 0 && (
            <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {video.performers.slice(0, 2).join(', ')}
              {video.performers.length > 2 && ` +${video.performers.length - 2}`}
            </div>
          )}
          
          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(video.createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const VideoListItem = ({ video }: { video: Video }) => {
    const [thumbnailError, setThumbnailError] = useState(false);
    
    return (
      <Card className="bg-gradient-to-r from-slate-800/90 to-slate-900/90 border-slate-700 hover:border-orange-500/50 transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="relative flex-shrink-0">
              {!thumbnailError ? (
                <img 
                  src={`/api/videos/${video.id}/thumbnail`}
                  alt={video.title}
                  className="w-24 h-16 object-cover rounded"
                  onError={() => setThumbnailError(true)}
                />
              ) : (
                <div className="w-24 h-16 bg-slate-700 rounded flex items-center justify-center">
                  <Play className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <Button
                onClick={() => openVideo(video)}
                className="absolute inset-0 bg-black/50 hover:bg-black/70 opacity-0 hover:opacity-100 transition-opacity rounded"
              >
                <Play className="w-4 h-4 text-white fill-white" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1 hover:text-orange-300 transition-colors cursor-pointer" 
                      onClick={() => openVideo(video)}>
                    {video.title}
                  </h3>
                  
                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {video.viewCount} views
                    </div>
                    {video.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {video.rating}/5
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(video.createdAt).toLocaleDateString()}
                    </div>
                    {video.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                  </div>
                  
                  {/* Tags and performers */}
                  <div className="flex flex-wrap gap-1">
                    {video.categories.slice(0, 2).map((cat, index) => (
                      <Badge key={index} className="bg-red-500/20 text-red-300 text-xs">
                        {cat}
                      </Badge>
                    ))}
                    {video.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs text-slate-400 border-slate-600">
                        {tag}
                      </Badge>
                    ))}
                    {video.performers.slice(0, 2).map((performer, index) => (
                      <Badge key={index} className="bg-blue-500/20 text-blue-300 text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {performer}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Action menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'favorite')}>
                      <Star className="w-4 h-4 mr-2" />
                      Add to Favorites
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'bookmark')}>
                      <Heart className="w-4 h-4 mr-2" />
                      Bookmark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'analyze')}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Analyze
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'similar')}>
                      <Users className="w-4 h-4 mr-2" />
                      Find Similar
                    </DropdownMenuItem>
                    {video.videoUrl && (
                      <DropdownMenuItem onClick={() => window.open(video.videoUrl, '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Original
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleVideoAction(video.id, 'delete')} className="text-red-400">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            📚 Video Library
          </h1>
          <p className="text-slate-400">
            Browse and manage your collection of {videos.length} videos
          </p>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="browse" className="data-[state=active]:bg-orange-600">
              Browse Videos
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-orange-600">
              Bulk Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Controls */}
            <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Search videos, tags, performers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  {/* Filters */}
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[150px] bg-slate-900 border-slate-600 text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="amateur">Amateur</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[120px] bg-slate-900 border-slate-600 text-white">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Recent</SelectItem>
                      <SelectItem value="popular">Popular</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* View mode */}
                  <div className="flex border border-slate-600 rounded-md overflow-hidden">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "rounded-none",
                        viewMode === "grid" ? "bg-orange-600 text-white" : "text-slate-400"
                      )}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "rounded-none",
                        viewMode === "list" ? "bg-orange-600 text-white" : "text-slate-400"
                      )}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Grid/List */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-slate-400 mt-4">Loading your video library...</p>
              </div>
            ) : videos.length === 0 ? (
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardContent className="p-12 text-center">
                  <div className="text-slate-400 mb-4">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold text-white mb-2">No videos found</h3>
                    <p>Your library is empty or no videos match your search criteria.</p>
                  </div>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Link className="w-4 h-4 mr-2" />
                    Import Videos
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={cn(
                viewMode === "grid" 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              )}>
                {videos.map((video: Video) => (
                  viewMode === "grid" ? (
                    <VideoCard key={video.id} video={video} />
                  ) : (
                    <VideoListItem key={video.id} video={video} />
                  )
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="import">
            <BulkUrlImport 
              onImportComplete={(results) => {
                console.log('Import completed:', results);
                refetch(); // Refresh the video list
              }} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
