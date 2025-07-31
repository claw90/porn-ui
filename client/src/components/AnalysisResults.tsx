import { useQuery } from "@tanstack/react-query";
import { Download, Clock, CheckCircle, Play, Image as ImageIcon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReportCustomizer } from "./ReportCustomizer";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import type { Analysis, ReportConfiguration } from "@shared/schema";

interface AnalysisResultsProps {
  analysisId: string | null;
}

export default function AnalysisResults({ analysisId }: AnalysisResultsProps) {
  const { toast } = useToast();
  const [showCustomizer, setShowCustomizer] = useState(false);

  const { data: analysis, isLoading } = useQuery<Analysis>({
    queryKey: ['/api/analyses', analysisId],
    enabled: !!analysisId,
    refetchInterval: (data) => {
      return (data as Analysis)?.status === 'processing' ? 2000 : false;
    },
  });

  const downloadReport = async () => {
    if (!analysisId) return;
    
    try {
      const response = await fetch(`/api/analyses/${analysisId}/report`);
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-report-${analysisId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Report Downloaded",
        description: "Analysis report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCustomReport = async (config: ReportConfiguration) => {
    if (!analysisId) return;
    
    try {
      const response = await apiRequest(`/api/analyses/${analysisId}/report/custom`, {
        method: 'POST',
        body: JSON.stringify(config),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.success) {
        await downloadReport();
        setShowCustomizer(false);
        toast({
          title: "Custom Report Generated",
          description: "Your customized report has been generated and downloaded.",
        });
      }
    } catch (error) {
      console.error('Error generating custom report:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate custom report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewReport = async (config: ReportConfiguration) => {
    if (!analysisId) return;
    
    try {
      const previewUrl = `/api/analyses/${analysisId}/report/preview`;
      const response = await fetch(previewUrl, {
        method: 'POST',
        body: JSON.stringify(config),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error previewing report:', error);
      toast({
        title: "Preview Failed",
        description: "Failed to generate report preview.",
        variant: "destructive",
      });
    }
  };

  const handleSaveTemplate = async (config: ReportConfiguration, name: string) => {
    try {
      await apiRequest('/api/report-templates', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: `Custom template - ${name}`,
          theme: config.theme,
          layout: 'custom',
          sections: [],
          styling: config.customStyles,
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      toast({
        title: "Template Saved",
        description: `Report template "${name}" has been saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Template Save Failed",
        description: "Failed to save report template.",
        variant: "destructive",
      });
    }
  };

  const showCompletedActions = analysis && analysis.status === 'completed';

  if (!analysisId || isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
            <Button disabled variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-4" />
            <p>No analysis results yet. Upload a video and target face to begin.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-gray-500">
            <p>Analysis not found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
          <div className="flex gap-2">
            {showCompletedActions && (
              <>
                <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Customize Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Customize Report</DialogTitle>
                    </DialogHeader>
                    <ReportCustomizer
                      analysisId={analysisId!}
                      onGenerateReport={handleCustomReport}
                      onPreviewReport={handlePreviewReport}
                      onSaveTemplate={handleSaveTemplate}
                    />
                  </DialogContent>
                </Dialog>
                <Button 
                  onClick={downloadReport}
                  variant="default" 
                  size="sm"
                  className="masculine-gradient"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </>
            )}
            
            {!showCompletedActions && (
              <Button 
                disabled
                variant="outline" 
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            )}
          </div>
        </div>

        {analysis.status === 'processing' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Processing video... This may take a few minutes.</p>
          </div>
        )}

        {analysis.status === 'error' && (
          <div className="text-center py-12 text-red-600">
            <p>An error occurred during processing. Please try again.</p>
          </div>
        )}

        {analysis.status === 'completed' && (
          <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 text-primary mr-2" />
                  <span className="font-medium">Processing Time</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {analysis.processingTime}s
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="font-medium">Matches Found</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {analysis.matchCount}
                </p>
              </div>
            </div>

            {/* Match Results */}
            {analysis.matches && analysis.matches.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Match Details</h3>
                {analysis.matches.map((match, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-24 h-16 bg-gray-300 rounded-lg flex-shrink-0 flex items-center justify-center">
                        {match.thumbnailPath ? (
                          <img 
                            src={`/${match.thumbnailPath}`} 
                            alt={`Frame ${match.frameNumber}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            Match at {match.timestamp}
                          </h4>
                          <Badge variant="secondary">
                            {Math.round(match.confidence * 100)}% Match
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Frame {match.frameNumber} • Confidence: {(match.confidence * 100).toFixed(1)}%
                        </p>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Play className="mr-1 h-3 w-3" />
                            Jump to Frame
                          </Button>
                          {match.thumbnailPath && (
                            <Button variant="ghost" size="sm">
                              <Download className="mr-1 h-3 w-3" />
                              Save Frame
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {analysis.matches && analysis.matches.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No matches found in this video.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
