import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface AdaptiveColorPaletteProps {
  videoUrl?: string;
  onColorChange?: (colors: string[]) => void;
}

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  muted: string;
}

export function AdaptiveColorPalette({ videoUrl, onColorChange }: AdaptiveColorPaletteProps) {
  const [palette, setPalette] = useState<ColorPalette>({
    primary: "#ff6b35",
    secondary: "#1a1a1a", 
    accent: "#ff8c42",
    background: "#0a0a0a",
    muted: "#333333"
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Extract dominant colors from video frame
  const extractColorsFromFrame = (imageData: ImageData): ColorPalette => {
    const data = imageData.data;
    const pixelCount = data.length / 4;
    
    // Color frequency map
    const colorMap = new Map<string, number>();
    
    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];
      
      // Skip transparent or very dark pixels
      if (alpha < 128 || (r + g + b) < 50) continue;
      
      // Group similar colors (reduce precision)
      const rGroup = Math.floor(r / 32) * 32;
      const gGroup = Math.floor(g / 32) * 32;
      const bGroup = Math.floor(b / 32) * 32;
      
      const color = `${rGroup},${gGroup},${bGroup}`;
      colorMap.set(color, (colorMap.get(color) || 0) + 1);
    }
    
    // Get top 5 most frequent colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return { r, g, b };
      });
    
    if (sortedColors.length === 0) {
      // Fallback to default orange theme
      return {
        primary: "#ff6b35",
        secondary: "#1a1a1a",
        accent: "#ff8c42", 
        background: "#0a0a0a",
        muted: "#333333"
      };
    }
    
    // Generate adaptive palette
    const dominant = sortedColors[0];
    const secondary = sortedColors[1] || dominant;
    
    // Convert to HSL for better color manipulation
    const primaryHsl = rgbToHsl(dominant.r, dominant.g, dominant.b);
    const secondaryHsl = rgbToHsl(secondary.r, secondary.g, secondary.b);
    
    // Create palette with proper contrast
    const primary = hslToHex(primaryHsl.h, Math.max(50, primaryHsl.s), Math.min(70, Math.max(40, primaryHsl.l)));
    const accent = hslToHex((primaryHsl.h + 30) % 360, Math.max(60, primaryHsl.s), Math.min(80, Math.max(50, primaryHsl.l)));
    const background = hslToHex(primaryHsl.h, Math.min(20, primaryHsl.s), Math.min(10, primaryHsl.l));
    const muted = hslToHex(primaryHsl.h, Math.min(30, primaryHsl.s), Math.min(25, Math.max(15, primaryHsl.l)));
    const secondaryColor = hslToHex(secondaryHsl.h, Math.min(40, secondaryHsl.s), Math.min(20, Math.max(10, secondaryHsl.l)));
    
    return {
      primary,
      secondary: secondaryColor,
      accent,
      background,
      muted
    };
  };

  // RGB to HSL conversion
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  };

  // HSL to Hex conversion
  const hslToHex = (h: number, s: number, l: number) => {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Analyze video for color palette
  const analyzeVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 90;

    const captureAndAnalyze = () => {
      if (video.readyState >= 2) {
        // Capture frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Extract colors
        const newPalette = extractColorsFromFrame(imageData);
        setPalette(newPalette);
        
        // Apply colors to CSS variables
        applyColorPalette(newPalette);
        
        // Notify parent component
        onColorChange?.([
          newPalette.primary,
          newPalette.secondary,
          newPalette.accent,
          newPalette.background,
          newPalette.muted
        ]);
        
        setIsAnalyzing(false);
      } else {
        setTimeout(captureAndAnalyze, 100);
      }
    };

    // Set video to 25% timestamp for good color sample
    video.currentTime = video.duration ? video.duration * 0.25 : 3;
    video.addEventListener('seeked', captureAndAnalyze, { once: true });
  };

  // Apply color palette to CSS variables
  const applyColorPalette = (colors: ColorPalette) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const { h, s, l } = rgbToHsl(r * 255, g * 255, b * 255);
      return `${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%`;
    };
    
    // Update CSS custom properties
    root.style.setProperty('--primary', hexToHsl(colors.primary));
    root.style.setProperty('--primary-foreground', '0 0% 98%');
    root.style.setProperty('--accent', hexToHsl(colors.accent));
    root.style.setProperty('--accent-foreground', '0 0% 98%');
    root.style.setProperty('--muted', hexToHsl(colors.muted));
    root.style.setProperty('--muted-foreground', '0 0% 63.9%');
    
    // Create gradient for masculine styling
    const gradient = `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`;
    root.style.setProperty('--masculine-gradient', gradient);
  };

  useEffect(() => {
    if (videoUrl && !videoUrl.includes('youtube.com') && !videoUrl.includes('thisvid.com')) {
      // Only analyze direct video files, not external embeds
      analyzeVideo();
    }
  }, [videoUrl]);

  return (
    <>
      {/* Hidden video and canvas for analysis */}
      {videoUrl && !videoUrl.includes('youtube.com') && !videoUrl.includes('thisvid.com') && (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            preload="metadata"
            className="hidden"
            onLoadedMetadata={analyzeVideo}
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
      
      {/* Color Palette Display */}
      <Card className="masculine-card border-primary/20">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Adaptive Color Palette</h3>
              {isAnalyzing && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(palette).map(([name, color]) => (
                <div key={name} className="text-center">
                  <div 
                    className="w-8 h-8 rounded border border-white/20 mx-auto mb-1"
                    style={{ backgroundColor: color }}
                  />
                  <div className="text-xs text-muted-foreground capitalize">{name}</div>
                </div>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground">
              Colors extracted from video content and applied to interface
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}