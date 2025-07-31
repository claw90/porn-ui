import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Image as ImageIcon
} from "lucide-react";

interface EmbeddedVideoPlayerProps {
  videoUrl?: string;
  onVideoLoad?: (video: any) => void;
  className?: string;
}

export function EmbeddedVideoPlayer({ 
  videoUrl, 
  onVideoLoad, 
  className = "" 
}: EmbeddedVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [showPlayer, setShowPlayer] = useState(false);
  const [loadMethod, setLoadMethod] = useState(0);
  const { toast } = useToast();

  // Different embedding methods to try
  const embedMethods = [
    {
      name: "Direct Embed",
      getUrl: (url: string) => {
        if (url.includes('thisvid.com')) {
          const match = url.match(/\/videos\/([^\/]+)/);
          return match ? `https://thisvid.com/embed/${match[1]}/?autoplay=1` : url;
        }
        return url;
      }
    },
    {
      name: "Iframe Embed",
      getUrl: (url: string) => url
    },
    {
      name: "Proxy Embed",
      getUrl: (url: string) => `https://noembed.com/embed?url=${encodeURIComponent(url)}`
    }
  ];

  // Extract thumbnail
  useEffect(() => {
    if (videoUrl) {
      const fetchThumbnail = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/extract-thumbnail?url=${encodeURIComponent(videoUrl)}`);
          const data = await response.json();
          if (data.thumbnail) {
            setThumbnailUrl(data.thumbnail);
          } else {
            setThumbnailUrl(`/api/generate-thumbnail?url=${encodeURIComponent(videoUrl)}`);
          }
        } catch (error) {
          console.error("Thumbnail fetch failed:", error);
          setThumbnailUrl(`/api/generate-thumbnail?url=${encodeURIComponent(videoUrl)}`);
        } finally {
          setIsLoading(false);
        }
      };
      fetchThumbnail();
    }
  }, [videoUrl]);

  const handlePlayVideo = () => {
    setShowPlayer(true);
    onVideoLoad?.({ 
      url: videoUrl, 
      method: embedMethods[loadMethod].name,
      thumbnail: thumbnailUrl 
    });
    
    toast({
      title: "Loading Video",
      description: `Attempting to embed with ${embedMethods[loadMethod].name}`,
    });
  };

  const tryNextMethod = () => {
    if (loadMethod < embedMethods.length - 1) {
      setLoadMethod(loadMethod + 1);
      setHasError(false);
      toast({
        title: "Trying Alternative Method",
        description: `Now using: ${embedMethods[loadMethod + 1].name}`,
      });
    } else {
      toast({
        title: "Opening Externally",
        description: "All embed methods failed, opening in new tab",
        variant: "destructive"
      });
      window.open(videoUrl, '_blank');
    }
  };

  if (!videoUrl) {
    return (
      <Card className={`masculine-card border-primary/20 ${className}`}>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No Video Selected</h3>
              <p className="text-muted-foreground">Choose a video from your library to start watching</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`masculine-card border-primary/20 ${className}`}>
      <CardContent className="p-0">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {/* Thumbnail View - before playing */}
          {!showPlayer && (
            <div className="relative w-full h-full cursor-pointer group" onClick={handlePlayVideo}>
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                  <div className="text-center space-y-3">
                    <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                    <div className="text-white">
                      <p className="text-sm">Loading preview...</p>
                    </div>
                  </div>
                </div>
              ) : thumbnailUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                    onError={() => setHasError(true)}
                    onLoad={() => setHasError(false)}
                  />
                  
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-primary/90 rounded-full p-6 transform scale-100 group-hover:scale-110 transition-transform">
                      <Play className="h-12 w-12 text-white fill-white" />
                    </div>
                  </div>
                  
                  {/* Play hint */}
                  <div className="absolute bottom-4 left-4 bg-black/80 text-white text-sm px-3 py-2 rounded">
                    Click to play video in app
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="bg-primary/90 rounded-full p-6 mx-auto w-fit group-hover:scale-110 transition-transform">
                      <Play className="h-12 w-12 text-white fill-white" />
                    </div>
                    <div className="text-white">
                      <p className="text-lg">Click to Play</p>
                      <p className="text-sm text-muted-foreground">Video will load in player</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Embedded Video Player */}
          {showPlayer && (
            <div className="relative w-full h-full">
              {hasError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                  <div className="text-center space-y-3">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto" />
                    <div className="text-white space-y-2">
                      <p className="text-sm">Failed to embed with {embedMethods[loadMethod].name}</p>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" onClick={tryNextMethod} className="masculine-gradient">
                          Try Next Method
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(videoUrl, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open External
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <iframe
                  src={embedMethods[loadMethod].getUrl(videoUrl)}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  frameBorder="0"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                  onLoad={() => {
                    console.log(`Video embedded successfully with ${embedMethods[loadMethod].name}`);
                    setHasError(false);
                  }}
                  onError={() => {
                    console.error(`Embed failed with ${embedMethods[loadMethod].name}`);
                    setHasError(true);
                  }}
                />
              )}

              {/* Embedded player controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="text-white hover:text-primary">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <span className="text-white text-sm">
                      Method: {embedMethods[loadMethod].name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={tryNextMethod}
                      className="text-white hover:text-primary"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Switch Method
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => window.open(videoUrl, '_blank')}
                      className="text-white hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      External
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Info Bar */}
        <div className="p-4 border-t border-primary/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Platform: {videoUrl.includes('thisvid.com') ? 'ThisVid' : 'External'}</span>
              {thumbnailUrl && !isLoading && (
                <span className="text-green-400">• Preview Available</span>
              )}
              {showPlayer && (
                <span className="text-blue-400">• Playing in App</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!showPlayer && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handlePlayVideo}
                  className="border-primary/30"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Play in App
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => window.open(videoUrl, '_blank')}
                className="border-primary/30"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                External
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}