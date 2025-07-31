import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ExternalLink, AlertCircle, Maximize2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface SimpleVideoPlayerProps {
  videoUrl: string;
  onVideoLoad?: (video: { method: string; success: boolean }) => void;
}

export function SimpleVideoPlayer({ videoUrl, onVideoLoad }: SimpleVideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedMethod, setEmbedMethod] = useState<'iframe' | 'external'>('iframe');
  const [urlStatus, setUrlStatus] = useState<'unknown' | 'valid' | 'invalid' | 'checking'>('unknown');

  // Extract domain info
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const domain = getDomain(videoUrl);
  const siteName = domain.includes('thisvid') ? 'ThisVid' : 
                   domain.includes('pornhub') ? 'PornHub' : 
                   domain.includes('xvideos') ? 'XVideos' : 
                   domain.charAt(0).toUpperCase() + domain.slice(1);

  useEffect(() => {
    if (!videoUrl) {
      setError('No video URL provided');
      setIsLoading(false);
      return;
    }

    // Auto-check URL validity
    checkUrlValidity();
    setIsLoading(false);
    onVideoLoad?.({ method: 'simple-player', success: true });
  }, [videoUrl, onVideoLoad]);

  const checkUrlValidity = async () => {
    if (!videoUrl) return;
    
    setUrlStatus('checking');
    try {
      // Simple HEAD request to check if URL is accessible
      const response = await fetch(videoUrl, { 
        method: 'HEAD', 
        mode: 'no-cors' 
      });
      setUrlStatus('valid');
    } catch (error) {
      console.log('URL check failed:', error);
      setUrlStatus('invalid');
    }
  };

  const handlePlayVideo = async () => {
    try {
      // Check if URL is accessible first
      const response = await fetch(videoUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // Allow cross-origin requests
      });
      
      // For sites requiring login, open in current tab to maintain session
      if (domain.includes('thisvid.com') || domain.includes('pornhub.com')) {
        // Open in current tab to maintain login session
        window.location.href = videoUrl;
      } else {
        // Open in new tab for other sites
        window.open(videoUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      }
    } catch (error) {
      // If URL check fails, still try to open it - might be CORS blocking the check
      console.log('URL check failed, attempting to open anyway:', error);
      
      if (domain.includes('thisvid.com') || domain.includes('pornhub.com')) {
        window.location.href = videoUrl;
      } else {
        window.open(videoUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      }
    }
  };

  const handleFullscreenEmbed = () => {
    setEmbedMethod('iframe');
  };

  const getEmbedUrl = (url: string) => {
    // For authentication-required sites, don't try embedding
    if (url.includes('thisvid.com')) {
      // ThisVid requires login - embedding won't work
      return null;
    }
    if (url.includes('pornhub.com')) {
      // Try PornHub embed format
      const match = url.match(/\/view_video\.php\?viewkey=([^&]+)/);
      if (match) {
        return `https://www.pornhub.com/embed/${match[1]}`;
      }
    }
    if (url.includes('xvideos.com')) {
      // XVideos embed format
      const match = url.match(/\/video(\d+)/);
      if (match) {
        return `https://www.xvideos.com/embedframe/${match[1]}`;
      }
    }
    return url;
  };

  if (error) {
    return (
      <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
            <h3 className="text-xl font-semibold text-white">Video Unavailable</h3>
            <p className="text-slate-300">{error}</p>
            <Button onClick={handlePlayVideo} variant="outline" className="border-primary/30">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Video Link
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Video Title */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Video from {siteName}
            </h3>
            <div className="flex items-center gap-2">
              {!domain.includes('thisvid.com') && getEmbedUrl(videoUrl) && (
                <Button
                  onClick={handleFullscreenEmbed}
                  variant="outline"
                  size="sm"
                  className="border-primary/30"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Try Embed
                </Button>
              )}
              <Button
                onClick={handlePlayVideo}
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <Play className="h-4 w-4 mr-2" />
                {domain.includes('thisvid.com') ? 'Login & Watch' : 'Play Video'}
              </Button>
            </div>
          </div>

          {/* Video Player Area */}
          <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden relative">
            {embedMethod === 'iframe' && getEmbedUrl(videoUrl) ? (
              <div className="w-full h-full relative">
                <iframe
                  src={getEmbedUrl(videoUrl)}
                  className="w-full h-full border-0"
                  allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  onLoad={() => {
                    setIsLoading(false);
                    onVideoLoad?.({ method: 'iframe-embed', success: true });
                  }}
                  onError={() => {
                    setError('Embed failed - click Play Video to open the site');
                  }}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-center p-8">
                <div className="mb-6">
                  <svg className="w-20 h-20 text-primary mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <h4 className="text-xl font-semibold text-white mb-2">Ready to Play</h4>
                  <p className="text-slate-300 mb-4">Click the button below to watch this video</p>
                </div>
                
                <div className="space-y-3">
                  <Button
                    onClick={handlePlayVideo}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Watch Video
                  </Button>
                  
                  <p className="text-sm text-slate-400">
                    {domain.includes('thisvid.com') || domain.includes('pornhub.com') 
                      ? "Opens in current tab (login required)" 
                      : "Opens in new tab for best viewing experience"}
                  </p>
                  
                  <div className="mt-3 p-2 bg-slate-700/50 rounded text-xs text-slate-300">
                    <div className="flex items-center gap-2 mb-2">
                      {urlStatus === 'checking' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {urlStatus === 'valid' && <CheckCircle className="w-3 h-3 text-green-400" />}
                      {urlStatus === 'invalid' && <XCircle className="w-3 h-3 text-red-400" />}
                      <span className="font-medium">
                        {urlStatus === 'checking' ? 'Checking URL...' :
                         urlStatus === 'valid' ? 'URL is accessible' :
                         urlStatus === 'invalid' ? 'URL may be broken' :
                         'URL not checked'}
                      </span>
                    </div>
                    <strong>Note:</strong> If you get "refused to connect" errors, the video URL may be broken or require direct site access. 
                    Try logging into {siteName} first, then return here.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="text-sm text-slate-400 bg-slate-800/50 rounded p-3">
            <div className="flex items-center justify-between">
              <span>Source: {domain}</span>
              <span className="text-primary">External Video</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}