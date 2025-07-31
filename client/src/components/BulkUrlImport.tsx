import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Link, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface BulkImportResult {
  url: string;
  success: boolean;
  error?: string;
  title?: string;
}

interface BulkUrlImportProps {
  onComplete?: (results: BulkImportResult[]) => void;
}

export function BulkUrlImport({ onComplete }: BulkUrlImportProps) {
  const [urlText, setUrlText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const extractUrls = (text: string): string[] => {
    const urlRegex = /https?:\/\/[^\s\n\r]+/gi;
    const matches = text.match(urlRegex) || [];
    // Remove duplicates and clean URLs
    return Array.from(new Set(matches.map(url => url.trim())));
  };

  const extractTitleFromUrl = (url: string): string => {
    try {
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      return lastPart.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ') || 'External Video';
    } catch {
      return 'External Video';
    }
  };

  const processUrls = async () => {
    const urls = extractUrls(urlText);
    
    if (urls.length === 0) {
      toast({
        title: "No URLs Found",
        description: "Please paste some valid URLs to import",
        variant: "destructive",
      });
      return;
    }

    if (urls.length > 500) {
      toast({
        title: "Too Many URLs",
        description: "Please limit bulk imports to 500 URLs at a time",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);
    setShowResults(true);

    const importResults: BulkImportResult[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const title = extractTitleFromUrl(url);

      try {
        // Validate URL format
        new URL(url);

        await apiRequest("/api/videos/url", {
          method: "POST",
          body: JSON.stringify({
            videoUrl: url,
            title: title,
            tags: ["bulk-import"],
            performers: [],
            categories: [],
          }),
          headers: { "Content-Type": "application/json" }
        });

        importResults.push({
          url,
          success: true,
          title,
        });

        toast({
          title: "URL Added",
          description: `Successfully added: ${title}`,
        });

      } catch (error: any) {
        importResults.push({
          url,
          success: false,
          error: error.message || "Failed to add URL",
        });
      }

      setProgress(((i + 1) / urls.length) * 100);
      setResults([...importResults]);

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    
    const successCount = importResults.filter(r => r.success).length;
    const failureCount = importResults.filter(r => !r.success).length;

    toast({
      title: "Bulk Import Complete",
      description: `Successfully imported ${successCount} videos. ${failureCount} failed.`,
    });

    onComplete?.(importResults);
  };

  const handleReset = () => {
    setUrlText("");
    setResults([]);
    setShowResults(false);
    setProgress(0);
  };

  const urlCount = extractUrls(urlText).length;

  return (
    <Card className="masculine-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <span className="masculine-text-gradient">Bulk URL Import</span>
        </CardTitle>
        <CardDescription>
          Import multiple video URLs at once. Paste URLs separated by new lines or spaces.
          Works with any video platform or direct video links.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!showResults ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="urlList">Video URLs</Label>
              <Textarea
                id="urlList"
                placeholder="Paste video URLs here (one per line or separated by spaces)&#10;&#10;Example:&#10;https://example.com/video1.mp4&#10;https://platform.com/watch?v=abc123&#10;https://site.com/videos/sample.webm"
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                className="bg-muted/50 border-primary/20 focus:border-primary min-h-[200px] font-mono text-sm"
              />
              {urlCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link className="h-4 w-4" />
                  <span>Found {urlCount} URL{urlCount !== 1 ? 's' : ''}</span>
                  {urlCount > 500 && (
                    <Badge variant="destructive">Too many URLs (limit: 500)</Badge>
                  )}
                </div>
              )}
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Supported Platforms
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                This bulk import works with ANY website including:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>• Direct video files (.mp4, .webm, etc.)</div>
                <div>• Streaming platforms</div>
                <div>• Adult content sites</div>
                <div>• Video hosting services</div>
                <div>• Custom video players</div>
                <div>• Any URL with video content</div>
              </div>
            </div>

            <Button
              onClick={processUrls}
              disabled={isProcessing || urlCount === 0 || urlCount > 500}
              className="w-full masculine-gradient hover:scale-105 transition-transform duration-300 glow-primary"
            >
              {isProcessing ? (
                "Processing URLs..."
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {urlCount} URL{urlCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <Label>Import Progress</Label>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(progress)}% complete
                </p>
              </div>
            )}

            {/* Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Import Results</Label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {results.filter(r => r.success).length} Success
                  </Badge>
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    {results.filter(r => !r.success).length} Failed
                  </Badge>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {result.title || result.url}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.url}
                        </p>
                        {result.error && (
                          <p className="text-xs text-red-500 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1 border-primary/30 hover:bg-primary/10"
                >
                  Import More URLs
                </Button>
                <Button
                  onClick={() => setShowResults(false)}
                  variant="default"
                  className="flex-1 masculine-gradient"
                >
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}