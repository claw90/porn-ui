import { useState } from "react";
import { User, Settings as SettingsIcon, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FileUpload from "./FileUpload";
import { Analysis } from "@shared/schema";

interface ControlPanelProps {
  onAnalysisCreated: (analysisId: string) => void;
  recentAnalyses: Analysis[];
}

export default function ControlPanel({ onAnalysisCreated, recentAnalyses }: ControlPanelProps) {
  const [targetFace, setTargetFace] = useState<File | null>(null);
  const [tolerance, setTolerance] = useState("0.5");
  const [frameSkip, setFrameSkip] = useState("5");
  const [includeThumbnails, setIncludeThumbnails] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'processing': return '⏳';
      case 'error': return '⚠';
      default: return '○';
    }
  };

  return (
    <>
      {/* Target Face Upload */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Face</h3>
          
          {!targetFace ? (
            <FileUpload
              accept="image/*"
              onFileSelect={setTargetFace}
              description="Upload target face image"
              subDescription="JPG, PNG (Max 10MB)"
              icon="user"
            />
          ) : (
            <div className="relative">
              <img 
                src={URL.createObjectURL(targetFace)} 
                alt="Target face preview" 
                className="w-full h-32 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setTargetFace(null)}
              >
                ×
              </Button>
              <p className="text-sm text-gray-600 mt-2">Target face loaded successfully</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Match Tolerance
              </label>
              <Select value={tolerance} onValueChange={setTolerance}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.4">High (0.4) - Strict matching</SelectItem>
                  <SelectItem value="0.5">Medium (0.5) - Balanced</SelectItem>
                  <SelectItem value="0.6">Low (0.6) - Loose matching</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frame Skip Rate
              </label>
              <Select value={frameSkip} onValueChange={setFrameSkip}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every frame (slower)</SelectItem>
                  <SelectItem value="5">Every 5 frames</SelectItem>
                  <SelectItem value="10">Every 10 frames (faster)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-thumbnails" 
                checked={includeThumbnails}
                onCheckedChange={(checked) => setIncludeThumbnails(checked === true)}
              />
              <label htmlFor="include-thumbnails" className="text-sm text-gray-700">
                Include frame thumbnails in report
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
          
          <div className="flex items-center text-gray-500">
            <Activity className="h-4 w-4 mr-2" />
            <span>Ready to analyze</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Analyses */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Analyses</h3>
          
          {recentAnalyses.length === 0 ? (
            <p className="text-sm text-gray-500">No recent analyses</p>
          ) : (
            <div className="space-y-3">
              {recentAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {analysis.videoFilename}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className={getStatusColor(analysis.status)}>
                        {getStatusIcon(analysis.status)} {analysis.status}
                      </Badge>
                      {analysis.status === 'completed' && (
                        <span className="text-xs text-gray-500">
                          {analysis.matchCount} matches
                        </span>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onAnalysisCreated(analysis.id)}
                  >
                    Load
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
