import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Upload, User, Globe, Star, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PerformerSearchResult {
  id: string;
  name: string;
  aliases: string[];
  age?: number;
  nationality?: string;
  height?: string;
  weight?: string;
  hairColor?: string;
  eyeColor?: string;
  ethnicity?: string;
  bodyType?: string;
  socialMedia: {
    twitter?: string;
    instagram?: string;
    onlyfans?: string;
    website?: string;
  };
  websites: string[];
  biography?: string;
  careerStart?: number;
  sourceImages: string[];
  confidence: number;
  isVerified: boolean;
}

export default function InternetPerformerSearch() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [searchResult, setSearchResult] = useState<PerformerSearchResult | null>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/performers/search-by-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      setSearchResult(data.performer);
      toast({
        title: "Performer Identified!",
        description: `Found ${data.performer.name} with ${Math.round(data.performer.confidence * 100)}% confidence`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/performers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Search Failed",
        description: error.message || "Could not identify performer from image",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setSearchResult(null);
    }
  };

  const handleSearch = () => {
    if (selectedImage) {
      searchMutation.mutate(selectedImage);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (confidence >= 0.6) return <Star className="h-4 w-4 text-yellow-400" />;
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="masculine-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-orange-400" />
            Internet Performer Search
          </CardTitle>
          <CardDescription>
            Upload a person's image to search the internet for matches and automatically generate their performer profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <label htmlFor="performer-image" className="block text-sm font-medium">
              Upload Performer Image
            </label>
            <div className="relative">
              <input
                id="performer-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="border-2 border-dashed border-zinc-600 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
                <User className="h-12 w-12 mx-auto mb-4 text-zinc-400" />
                {selectedImage ? (
                  <div>
                    <p className="text-green-400 font-medium">{selectedImage.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Size: {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-zinc-300 mb-2">Drop performer image here or click to browse</p>
                    <p className="text-xs text-zinc-500">
                      Supports JPG, PNG, GIF, WEBP. Best results with clear face shots.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={!selectedImage || searchMutation.isPending}
            className="w-full bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
          >
            {searchMutation.isPending ? (
              <>
                <Globe className="h-4 w-4 mr-2 animate-spin" />
                Searching Internet...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search for Performer
              </>
            )}
          </Button>

          {/* Progress Bar */}
          {searchMutation.isPending && (
            <div className="space-y-2">
              <Progress value={75} className="h-2" />
              <p className="text-xs text-zinc-400 text-center">
                Searching Google, Bing, and Yandex for matches...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResult && (
        <Card className="masculine-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-400" />
                Performer Identified
              </span>
              <div className="flex items-center gap-2">
                {getConfidenceIcon(searchResult.confidence)}
                <span className={`text-sm ${getConfidenceColor(searchResult.confidence)}`}>
                  {Math.round(searchResult.confidence * 100)}% confidence
                </span>
              </div>
            </CardTitle>
            <CardDescription>
              Performer profile automatically generated from internet search results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-orange-400">{searchResult.name}</h3>
                  {searchResult.aliases.length > 0 && (
                    <p className="text-sm text-zinc-400">
                      Also known as: {searchResult.aliases.join(', ')}
                    </p>
                  )}
                </div>

                {searchResult.biography && (
                  <div>
                    <h4 className="font-medium text-zinc-300 mb-1">Biography</h4>
                    <p className="text-sm text-zinc-400">{searchResult.biography}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {searchResult.age && (
                    <div>
                      <span className="text-zinc-500">Age:</span>
                      <span className="ml-2 text-zinc-300">{searchResult.age}</span>
                    </div>
                  )}
                  {searchResult.nationality && (
                    <div>
                      <span className="text-zinc-500">Nationality:</span>
                      <span className="ml-2 text-zinc-300">{searchResult.nationality}</span>
                    </div>
                  )}
                  {searchResult.height && (
                    <div>
                      <span className="text-zinc-500">Height:</span>
                      <span className="ml-2 text-zinc-300">{searchResult.height}</span>
                    </div>
                  )}
                  {searchResult.ethnicity && (
                    <div>
                      <span className="text-zinc-500">Ethnicity:</span>
                      <span className="ml-2 text-zinc-300">{searchResult.ethnicity}</span>
                    </div>
                  )}
                  {searchResult.hairColor && (
                    <div>
                      <span className="text-zinc-500">Hair:</span>
                      <span className="ml-2 text-zinc-300">{searchResult.hairColor}</span>
                    </div>
                  )}
                  {searchResult.eyeColor && (
                    <div>
                      <span className="text-zinc-500">Eyes:</span>
                      <span className="ml-2 text-zinc-300">{searchResult.eyeColor}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            {Object.keys(searchResult.socialMedia).filter(key => searchResult.socialMedia[key as keyof typeof searchResult.socialMedia]).length > 0 && (
              <div>
                <h4 className="font-medium text-zinc-300 mb-2">Social Media</h4>
                <div className="flex flex-wrap gap-2">
                  {searchResult.socialMedia.twitter && (
                    <a
                      href={searchResult.socialMedia.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 transition-colors"
                    >
                      Twitter
                    </a>
                  )}
                  {searchResult.socialMedia.instagram && (
                    <a
                      href={searchResult.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-pink-600 text-white text-xs rounded-full hover:bg-pink-700 transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                  {searchResult.socialMedia.onlyfans && (
                    <a
                      href={searchResult.socialMedia.onlyfans}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full hover:bg-blue-600 transition-colors"
                    >
                      OnlyFans
                    </a>
                  )}
                  {searchResult.socialMedia.website && (
                    <a
                      href={searchResult.socialMedia.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded-full hover:bg-gray-700 transition-colors"
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Found Images Count */}
            {searchResult.sourceImages.length > 0 && (
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Found {searchResult.sourceImages.length} matching images across multiple search engines.
                  Profile has been automatically added to your Performers section.
                </AlertDescription>
              </Alert>
            )}

            {/* Verification Status */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                {searchResult.isVerified ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400">Verified Profile</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400">Unverified - Review Data</span>
                  </>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                Created from {searchResult.websites.length} sources
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}