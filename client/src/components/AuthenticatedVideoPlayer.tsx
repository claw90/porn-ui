import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ExternalLink, AlertCircle } from 'lucide-react';

interface AuthenticatedVideoPlayerProps {
  videoUrl: string;
  onVideoLoad?: (video: { method: string; success: boolean }) => void;
}

export function AuthenticatedVideoPlayer({ videoUrl, onVideoLoad }: AuthenticatedVideoPlayerProps) {
  const [embedMethod, setEmbedMethod] = useState<'iframe' | 'proxy' | 'direct' | 'failed'>('iframe');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract domain for authentication-specific handling
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const domain = getDomain(videoUrl);
  const isThisVid = domain.includes('thisvid.com');

  useEffect(() => {
    if (!videoUrl) {
      setError('No video URL provided');
      setIsLoading(false);
      return;
    }

    // Start with iframe method for authenticated sites
    setEmbedMethod('iframe');
    setIsLoading(false);
    onVideoLoad?.({ method: 'authenticated-iframe', success: true });
  }, [videoUrl, onVideoLoad]);

  const handleDirectAccess = () => {
    window.open(videoUrl, '_blank');
  };

  const renderPlayer = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Video Unavailable</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleDirectAccess} variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      );
    }

    if (embedMethod === 'iframe') {
      return (
        <div className="relative w-full h-full">
          <iframe
            src={videoUrl}
            className="w-full h-full rounded border-0"
            allow="fullscreen; autoplay; encrypted-media"
            allowFullScreen
            style={{ minHeight: '400px' }}
            onLoad={() => {
              setIsLoading(false);
              onVideoLoad?.({ method: 'authenticated-iframe', success: true });
            }}
            onError={() => {
              setError('Failed to load video iframe');
              setIsLoading(false);
            }}
          />
          {isThisVid && (
            <div className="absolute top-4 right-4 bg-black/80 px-3 py-1 rounded text-xs text-white">
              Authenticated Session Required
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-full p-6 mb-4">
          <Play className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Session-Protected Video</h3>
        <p className="text-muted-foreground mb-4">
          This video requires {isThisVid ? 'ThisVid.com' : 'site'} login to access
        </p>
        <div className="flex gap-2">
          <Button onClick={handleDirectAccess} variant="default">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button 
            onClick={() => setEmbedMethod('iframe')} 
            variant="outline"
          >
            Try Embed
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="masculine-card border-primary/20 overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/10 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {renderPlayer()}
        </div>
      </CardContent>
    </Card>
  );
}