import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Camera, 
  CameraOff, 
  Play, 
  Pause, 
  Square, 
  Users, 
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";

interface FaceMatch {
  confidence: number;
  performer: string;
  timestamp: number;
  frameNumber: number;
}

interface RealTimeFaceRecognitionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  targetFaceImage?: string;
  onMatchFound?: (matches: FaceMatch[]) => void;
}

export function RealTimeFaceRecognition({ 
  videoRef, 
  targetFaceImage, 
  onMatchFound 
}: RealTimeFaceRecognitionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matches, setMatches] = useState<FaceMatch[]>([]);
  const [confidence, setConfidence] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const { toast } = useToast();

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const analyzeFrame = async (frameData: string) => {
    if (!targetFaceImage) {
      toast({
        title: "No Target Face",
        description: "Please upload a target face image first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("/api/face-recognition/realtime", {
        method: "POST",
        body: JSON.stringify({
          frameData,
          targetFaceImage,
          confidence,
          timestamp: videoRef.current?.currentTime || 0,
        }),
        headers: { "Content-Type": "application/json" }
      });

      if (response.match) {
        const newMatch: FaceMatch = {
          confidence: response.confidence,
          performer: response.performer || "Unknown",
          timestamp: response.timestamp,
          frameNumber: Math.floor((videoRef.current?.currentTime || 0) * 30), // Assuming 30fps
        };

        setMatches(prev => [...prev, newMatch]);
        onMatchFound?.([...matches, newMatch]);

        toast({
          title: "Face Match Found!",
          description: `${response.performer} detected with ${(response.confidence * 100).toFixed(1)}% confidence`,
        });
      }
    } catch (error) {
      console.error("Real-time analysis error:", error);
    }
  };

  const startAnalysis = () => {
    if (!videoRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setMatches([]);
    setProgress(0);

    toast({
      title: "Real-time Analysis Started",
      description: "Analyzing video frames for face matches...",
    });

    // Analyze every 2 seconds
    intervalRef.current = setInterval(() => {
      const frameData = captureFrame();
      if (frameData) {
        analyzeFrame(frameData);
      }
      
      // Update progress based on video current time
      if (videoRef.current) {
        const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(currentProgress);
      }
    }, 2000);
  };

  const stopAnalysis = () => {
    setIsAnalyzing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    toast({
      title: "Analysis Stopped",
      description: `Found ${matches.length} face matches`,
    });
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <Card className="masculine-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5 text-primary" />
          Real-time Face Recognition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={isAnalyzing ? stopAnalysis : startAnalysis}
            className={isAnalyzing ? "bg-red-600 hover:bg-red-700" : "masculine-gradient"}
            disabled={!videoRef.current || !targetFaceImage}
          >
            {isAnalyzing ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop Analysis
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Analysis
              </>
            )}
          </Button>
          
          {isAnalyzing && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing...
            </Badge>
          )}
        </div>

        {/* Confidence Slider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Confidence Threshold: {(confidence * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            disabled={isAnalyzing}
          />
        </div>

        {/* Progress */}
        {isAnalyzing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              Video Progress: {progress.toFixed(1)}%
            </p>
          </div>
        )}

        {/* Real-time Matches */}
        {matches.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Live Matches ({matches.length})
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {matches.slice(-5).map((match, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="font-medium">{match.performer}</span>
                  </div>
                  <div className="text-right">
                    <div>{(match.confidence * 100).toFixed(1)}%</div>
                    <div className="text-muted-foreground">
                      {Math.floor(match.timestamp / 60)}:{(match.timestamp % 60).toFixed(0).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {!targetFaceImage ? (
            <>
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              Upload a target face image to enable real-time analysis
            </>
          ) : !videoRef.current ? (
            <>
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              Load a video to start real-time face recognition
            </>
          ) : (
            <>
              <CheckCircle className="h-3 w-3 text-green-500" />
              Ready for real-time analysis
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}