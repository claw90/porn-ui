import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Heart, Eye, Clock } from "lucide-react";

const trendingVideos = [
  {
    id: 1,
    title: "🌟 Premium Collection Vol. 1",
    thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=225&fit=crop",
    duration: "12:34",
    views: "2.1K",
    rating: "4.8",
    category: "Premium"
  },
  {
    id: 2,
    title: "💎 Elite Series - Episode 3",
    thumbnail: "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=225&fit=crop",
    duration: "18:45",
    views: "1.8K",
    rating: "4.9",
    category: "Series"
  },
  {
    id: 3,
    title: "🔥 Hot New Release",
    thumbnail: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=225&fit=crop",
    duration: "25:12",
    views: "3.2K",
    rating: "4.7",
    category: "New"
  },
  {
    id: 4,
    title: "⭐ Fan Favorites Compilation",
    thumbnail: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400&h=225&fit=crop",
    duration: "32:18",
    views: "4.5K",
    rating: "4.9",
    category: "Popular"
  },
  {
    id: 5,
    title: "🎭 Artistic Collection",
    thumbnail: "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400&h=225&fit=crop",
    duration: "15:27",
    views: "1.4K",
    rating: "4.6",
    category: "Artistic"
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-2">
            🔥 Chris' Secret Stash
          </h1>
          <p className="text-slate-300 text-lg">Your Premium Private Collection</p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-orange-500/50 transition-all duration-300 cursor-pointer group">
            <CardHeader className="pb-3">
              <CardTitle className="text-orange-400 group-hover:text-orange-300 transition-colors">📚 Library</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Browse your video collection</p>
              <Badge className="mt-2 bg-orange-500/20 text-orange-300 border-orange-500/30">2,847 videos</Badge>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-pink-500/50 transition-all duration-300 cursor-pointer group">
            <CardHeader className="pb-3">
              <CardTitle className="text-pink-400 group-hover:text-pink-300 transition-colors">👥 Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Manage performer profiles</p>
              <Badge className="mt-2 bg-pink-500/20 text-pink-300 border-pink-500/30">1,234 profiles</Badge>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-400 group-hover:text-blue-300 transition-colors">🎯 Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">Discover new content</p>
              <Badge className="mt-2 bg-blue-500/20 text-blue-300 border-blue-500/30">15 new</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trending Today Section */}
      <div className="px-6 pb-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            🔥 <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Trending Today</span>
          </h2>
          <p className="text-slate-400">Most popular content in your collection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {trendingVideos.map((video) => (
            <Card key={video.id} className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700 hover:border-orange-500/50 transition-all duration-300 cursor-pointer group overflow-hidden">
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
                <div className="absolute top-2 left-2">
                  <Badge className="bg-red-500/90 text-white border-red-500 text-xs">
                    {video.category}
                  </Badge>
                </div>
                <div className="absolute bottom-2 right-2">
                  <Badge className="bg-black/80 text-white border-slate-600 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {video.duration}
                  </Badge>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-orange-500/90 rounded-full p-3">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-orange-300 transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {video.views}
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-400" />
                    {video.rating}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* View More Button */}
        <div className="text-center mt-8">
          <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg">
            🚀 View All Trending Content
          </button>
        </div>
      </div>
    </div>
  );
}
