import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { 
  Brain,
  Upload,
  Play,
  Search,
  Eye,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Download,
  FileImage,
  VideoIcon,
  Zap,
  Settings,
  HelpCircle,
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Analysis {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  videoFilename: string;
  targetFaceFilename?: string;
  matchCount: number;
  tolerance: number;
  frameSkip: number;
  includeThumbnails: boolean;
  processingTime?: number;
  matches: any[];
  createdAt: string;
  completedAt?: string;
}

export default function FaceRecognition() {
  const [selectedTab, setSelectedTab] = useState("analyze");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [tolerance, setTolerance] = useState(0.5);
  const [frameSkip, setFrameSkip] = useState(5);
  const [includeThumbnails, setIncludeThumbnails] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<string | null>(null);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const [faceDragOver, setFaceDragOver] = useState(false);

  const { data: analyses = [], refetch } = useQuery({
    queryKey: ['analyses'],
    queryFn: async () => {
      const response = await fetch('/api/analyses');
      if (!response.ok) throw new Error('Failed to fetch analyses');
      return response.json();
    },
  });

  const { data: analysisStatus } = useQuery({
    queryKey: ['analysis-status', currentAnalysis],
    queryFn: async () => {
      if (!currentAnalysis) return null;
      const response = await fetch(`/api/analyses/${currentAnalysis}`);
      if (!response.ok) throw new Error('Failed to fetch analysis status');
      return response.json();
    },
    enabled: !!currentAnalysis && isAnalyzing,
    refetchInterval: 2000, // Poll every 2 seconds when analyzing
  });

  const getAnalysisMode = () => {
    if (videoFile && faceFile) return "both";
    if (videoFile) return "video-only";
    if (faceFile) return "face-only";
    return "none";
  };

  const getSubmitButtonText = () => {
    const mode = getAnalysisMode();
    if (isAnalyzing) return "Analyzing...";
    
    switch (mode) {
      case "both": return "Find Specific Face";
      case "video-only": return "Detect All Faces";
      case "face-only": return "Analyze Face Characteristics";
      default: return "Upload Files to Start";
    }
  };

  const handleSubmit = async () => {
    const mode = getAnalysisMode();
    if (mode === "none") return;

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      
      if (videoFile) formData.append('video', videoFile);
      if (faceFile) formData.append('targetFace', faceFile);
      
      formData.append('tolerance', tolerance.toString());
      formData.append('frameSkip', frameSkip.toString());
      formData.append('includeThumbnails', includeThumbnails.toString());

      const response = await fetch('/api/analyses', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Analysis failed');
      }

      const analysis = await response.json();
      setCurrentAnalysis(analysis.id);
      
      // Start polling for status
      const checkStatus = () => {
        fetch(`/api/analyses/${analysis.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'completed' || data.status === 'error') {
              setIsAnalyzing(false);
              setCurrentAnalysis(null);
              refetch(); // Refresh analyses list
            } else {
              setTimeout(checkStatus, 2000);
            }
          })
          .catch(() => {
            setIsAnalyzing(false);
            setCurrentAnalysis(null);
          });
      };
      
      checkStatus();
    } catch (error) {
      console.error('Analysis error:', error);
      setIsAnalyzing(false);
      setCurrentAnalysis(null);
      alert(error instanceof Error ? error.message : 'Analysis failed');
    }
  };

  const downloadReport = async (analysisId: string) => {
    try {
      const response = await fetch(`/api/analyses/${analysisId}/report`);
      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-report-${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download report');
    }
  };

  // Drag and drop handlers for video upload
  const handleVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setVideoDragOver(true);
  };

  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setVideoDragOver(false);
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setVideoDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
      } else {
        alert('Please drop a valid video file (MP4, AVI, MOV, MKV)');
      }
    }
  };

  // Drag and drop handlers for face upload
  const handleFaceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setFaceDragOver(true);
  };

  const handleFaceDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setFaceDragOver(false);
  };

  const handleFaceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFaceDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setFaceFile(file);
      } else {
        alert('Please drop a valid image file (JPG, PNG, JPEG)');
      }
    }
  };

  const AnalysisCard = ({ analysis }: { analysis: Analysis }) => (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm mb-1">{analysis.videoFilename}</h3>
            {analysis.targetFaceFilename && (
              <p className="text-xs text-slate-400">Target: {analysis.targetFaceFilename}</p>
            )}
          </div>
          <Badge className={cn(
            "text-xs",
            analysis.status === 'completed' ? "bg-green-500/20 text-green-300" :
            analysis.status === 'processing' ? "bg-yellow-500/20 text-yellow-300" :
            analysis.status === 'error' ? "bg-red-500/20 text-red-300" :
            "bg-blue-500/20 text-blue-300"
          )}>
            {analysis.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
            {analysis.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
            {analysis.status === 'processing' && <Clock className="w-3 h-3 mr-1" />}
            {analysis.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 mb-3">
          <div>
            <span className="text-slate-500">Matches:</span> {analysis.matchCount}
          </div>
          <div>
            <span className="text-slate-500">Tolerance:</span> {analysis.tolerance}
          </div>
          <div>
            <span className="text-slate-500">Frame Skip:</span> {analysis.frameSkip}
          </div>
          <div>
            <span className="text-slate-500">Time:</span> {analysis.processingTime || '—'}s
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            {new Date(analysis.createdAt).toLocaleDateString()}
          </div>
          {analysis.status === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => downloadReport(analysis.id)}
              className="text-slate-400 hover:text-white"
            >
              <Download className="w-3 h-3 mr-1" />
              Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-6 h-6 text-purple-400" />
            <Badge className="bg-red-500/20 text-red-300">Backend Only</Badge>
            <Badge className="bg-blue-500/20 text-blue-300">Advanced Tool</Badge>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            Face Recognition Analysis
          </h1>
          <p className="text-slate-400">
            Server-side Python backend for advanced face detection and matching across video content
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="analyze" className="data-[state=active]:bg-purple-600">
              <Brain className="w-4 h-4 mr-2" />
              Face Analysis
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-purple-600">
              <Clock className="w-4 h-4 mr-2" />
              Analysis History
            </TabsTrigger>
            <TabsTrigger value="help" className="data-[state=active]:bg-purple-600">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help & Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="space-y-6">
            {/* Upload & Analysis Section */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-400" />
                    Face Analysis
                  </span>
                  <Badge className="bg-purple-500/20 text-purple-300">{getAnalysisMode()}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Areas Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Video Upload */}
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                      videoDragOver
                        ? "border-purple-400 bg-purple-500/10"
                        : "border-slate-600 hover:border-slate-500"
                    )}
                    onDragOver={handleVideoDragOver}
                    onDragLeave={handleVideoDragLeave}
                    onDrop={handleVideoDrop}
                    onClick={() => document.getElementById('video-upload')?.click()}
                  >
                    <VideoIcon className={cn(
                      "w-6 h-6 mx-auto mb-2",
                      videoDragOver ? "text-purple-400" : "text-blue-400"
                    )} />
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="video-upload"
                    />
                    <div className="text-white font-medium text-sm mb-1">
                      {videoDragOver
                        ? 'Drop video here'
                        : videoFile
                          ? videoFile.name.length > 20 ? videoFile.name.substring(0, 20) + '...' : videoFile.name
                          : 'Video File'
                      }
                    </div>
                    <div className="text-xs text-slate-400">
                      {videoDragOver ? 'Release to upload' : 'MP4, AVI, MOV, MKV'}
                    </div>
                  </div>

                  {/* Face Upload */}
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                      faceDragOver
                        ? "border-green-400 bg-green-500/10"
                        : "border-slate-600 hover:border-slate-500"
                    )}
                    onDragOver={handleFaceDragOver}
                    onDragLeave={handleFaceDragLeave}
                    onDrop={handleFaceDrop}
                    onClick={() => document.getElementById('face-upload')?.click()}
                  >
                    <FileImage className={cn(
                      "w-6 h-6 mx-auto mb-2",
                      faceDragOver ? "text-green-400" : "text-green-400"
                    )} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFaceFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="face-upload"
                    />
                    <div className="text-white font-medium text-sm mb-1">
                      {faceDragOver
                        ? 'Drop image here'
                        : faceFile
                          ? faceFile.name.length > 20 ? faceFile.name.substring(0, 20) + '...' : faceFile.name
                          : 'Target Face'
                      }
                    </div>
                    <div className="text-xs text-slate-400">
                      {faceDragOver ? 'Release to upload' : 'JPG, PNG, JPEG'}
                    </div>
                  </div>
                </div>

                {/* Analysis Modes Info */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-slate-800/30 rounded">
                    <VideoIcon className="w-3 h-3 mx-auto mb-1 text-blue-400" />
                    <div className="text-slate-300">Video Only</div>
                    <div className="text-slate-500">Detect all faces</div>
                  </div>
                  <div className="text-center p-2 bg-slate-800/30 rounded">
                    <FileImage className="w-3 h-3 mx-auto mb-1 text-green-400" />
                    <div className="text-slate-300">Face Only</div>
                    <div className="text-slate-500">Analyze features</div>
                  </div>
                  <div className="text-center p-2 bg-slate-800/30 rounded">
                    <Search className="w-3 h-3 mx-auto mb-1 text-purple-400" />
                    <div className="text-slate-300">Both Files</div>
                    <div className="text-slate-500">Find matches</div>
                  </div>
                </div>

                {/* Analysis Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white font-medium">Tolerance</Label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0.3"
                        max="0.8"
                        step="0.05"
                        value={tolerance}
                        onChange={(e) => setTolerance(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Strict ({tolerance})</span>
                        <span>Lenient</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white font-medium">Frame Skip</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={frameSkip}
                      onChange={(e) => setFrameSkip(parseInt(e.target.value) || 5)}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400">Process every Nth frame</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white font-medium">Options</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="thumbnails"
                        checked={includeThumbnails}
                        onChange={(e) => setIncludeThumbnails(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="thumbnails" className="text-white text-sm">
                        Generate thumbnails
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={getAnalysisMode() === "none" || isAnalyzing}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Brain className={cn("w-4 h-4 mr-2", isAnalyzing && "animate-pulse")} />
                    {getSubmitButtonText()}
                  </Button>
                </div>

                {/* Analysis Progress */}
                {isAnalyzing && analysisStatus && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                        <div>
                          <h4 className="text-white font-medium">Analysis in Progress</h4>
                          <p className="text-slate-400 text-sm">Processing video frames with Python backend...</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Status: {analysisStatus.status}</span>
                          <span className="text-slate-400">Matches found: {analysisStatus.matchCount || 0}</span>
                        </div>
                        <Progress value={analysisStatus.status === 'processing' ? 50 : 10} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    Analysis History
                  </span>
                  <Badge className="bg-purple-500/20 text-purple-300">
                    {analyses.length} total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyses.length > 0 ? (
                  <div className="grid gap-4">
                    {analyses.map((analysis: Analysis) => (
                      <AnalysisCard key={analysis.id} analysis={analysis} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-slate-500 opacity-50" />
                    <h3 className="text-xl font-semibold text-white mb-2">No analyses yet</h3>
                    <p className="text-slate-400 mb-4">Start your first face recognition analysis to see results here</p>
                    <Button
                      onClick={() => setSelectedTab("analyze")}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Start Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="help" className="space-y-6">
            <div className="grid gap-6">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-purple-400" />
                    How Face Recognition Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Backend Processing</h4>
                    <p className="text-slate-400 text-sm">
                      This tool uses Python scripts running on the server to perform face detection and matching. 
                      The analysis happens entirely on the backend using the face_recognition library and OpenCV.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Analysis Process</h4>
                    <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
                      <li>Video frames are extracted at specified intervals</li>
                      <li>Face detection runs on each frame</li>
                      <li>If a target face is provided, matching is performed</li>
                      <li>Results include timestamps, confidence scores, and optional thumbnails</li>
                      <li>Comprehensive PDF reports are generated</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Performance Tips</h4>
                    <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
                      <li>Higher frame skip values process faster but may miss quick appearances</li>
                      <li>Lower tolerance is more strict, higher tolerance catches more potential matches</li>
                      <li>Thumbnail generation increases processing time but aids in result review</li>
                      <li>Shorter videos and smaller frame skip values provide more thorough analysis</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    Technical Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Server Requirements</h4>
                      <ul className="text-slate-400 text-sm space-y-1">
                        <li>• Python 3.7+ with face_recognition library</li>
                        <li>• OpenCV for video processing</li>
                        <li>• NumPy for numerical computations</li>
                        <li>• Sufficient CPU/GPU for processing</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Supported Formats</h4>
                      <ul className="text-slate-400 text-sm space-y-1">
                        <li>• Video: MP4, AVI, MOV, MKV, WMV</li>
                        <li>• Images: JPG, JPEG, PNG, BMP</li>
                        <li>• Max file size: 500MB</li>
                        <li>• Recommended resolution: 720p+</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
