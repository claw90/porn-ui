import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

interface SessionAwareThumbnailProps {
  videoUrl: string;
  className?: string;
  fallbackSvg?: boolean;
}

export function SessionAwareThumbnail({ 
  videoUrl, 
  className = "w-full h-full object-cover",
  fallbackSvg = true 
}: SessionAwareThumbnailProps) {
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate fallback SVG thumbnail
  const generateFallbackThumbnail = (url: string) => {
    const domain = url.includes('thisvid.com') ? 'ThisVid' : 'Video';
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="160" height="90" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <circle cx="80" cy="45" r="20" fill="#ff6b1a" opacity="0.8"/>
        <polygon points="72,35 72,55 88,45" fill="white"/>
        <text x="80" y="70" text-anchor="middle" fill="#999" font-size="8" font-family="Arial">${domain}</text>
      </svg>
    `)}`;
  };

  // Extract video ID or use proxy method
  const getThumbnailFromSession = async (url: string) => {
    try {
      // For thisvid.com, try to extract thumbnail using user's session
      if (url.includes('thisvid.com')) {
        // Create a hidden iframe to load the page with user's session
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        document.body.appendChild(iframe);

        return new Promise<string>((resolve) => {
          iframe.onload = () => {
            setTimeout(() => {
              try {
                // Try to extract thumbnail from the loaded page
                const doc = iframe.contentDocument;
                if (doc) {
                  const metaTags = doc.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]');
                  for (let i = 0; i < metaTags.length; i++) {
                    const meta = metaTags[i];
                    const content = meta.getAttribute('content');
                    if (content) {
                      document.body.removeChild(iframe);
                      resolve(content);
                      return;
                    }
                  }
                }
              } catch (e) {
                // Cross-origin restriction - expected
              }
              document.body.removeChild(iframe);
              resolve(generateFallbackThumbnail(url));
            }, 2000);
          };

          iframe.onerror = () => {
            document.body.removeChild(iframe);
            resolve(generateFallbackThumbnail(url));
          };

          // Set timeout fallback
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve(generateFallbackThumbnail(url));
          }, 5000);

          iframe.src = url;
        });
      }

      // For other sites, use fallback
      return generateFallbackThumbnail(url);
    } catch (error) {
      return generateFallbackThumbnail(url);
    }
  };

  useEffect(() => {
    if (!videoUrl) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Try API first, then fallback to session-aware method
    const tryApiThumbnail = async () => {
      try {
        const response = await fetch(`/api/generate-thumbnail?url=${encodeURIComponent(videoUrl)}`);
        if (response.ok && !response.redirected) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setThumbnailSrc(objectUrl);
          setIsLoading(false);
          return true;
        }
      } catch (error) {
        // API failed, continue to session method
      }
      return false;
    };

    tryApiThumbnail().then(async (apiSuccess) => {
      if (!apiSuccess) {
        // API failed, try session-aware method
        const sessionThumbnail = await getThumbnailFromSession(videoUrl);
        setThumbnailSrc(sessionThumbnail);
        setIsLoading(false);
      }
    });

    return () => {
      // Cleanup object URLs
      if (thumbnailSrc && thumbnailSrc.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailSrc);
      }
    };
  }, [videoUrl, thumbnailSrc]);

  if (isLoading) {
    return (
      <div className={`${className} bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center`}>
        <div className="animate-pulse">
          <Play className="h-6 w-6 text-primary/60" />
        </div>
      </div>
    );
  }

  if (hasError || !thumbnailSrc) {
    return (
      <div className={`${className} bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center`}>
        <Play className="h-6 w-6 text-primary" />
      </div>
    );
  }

  return (
    <img
      src={thumbnailSrc}
      alt="Video thumbnail"
      className={className}
      onError={() => {
        setHasError(true);
        setThumbnailSrc(generateFallbackThumbnail(videoUrl));
      }}
    />
  );
}