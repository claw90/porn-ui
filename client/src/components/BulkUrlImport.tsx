import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, XCircle, Link, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportResult {
  url: string;
  success: boolean;
  title?: string;
  error?: string;
  videoId?: string;
}

interface BulkUrlImportProps {
  onImportComplete?: (results: ImportResult[]) => void;
}

export default function BulkUrlImport({ onImportComplete }: BulkUrlImportProps) {
  const [urls, setUrls] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");

  const extractUrls = (text: string): string[] => {
    // Enhanced URL detection for adult video platforms
    const urlRegex = /(https?:\/\/(?:www\.)?(?:thisvid\.com|pornhub\.com|xvideos\.com|redtube\.com|xhamster\.com|xtube\.com|tube8\.com|spankbang\.com|youporn\.com|beeg\.com|motherless\.com|drtuber\.com|tnaflix\.com|vporn\.com|ashemaletube\.com|gaymaletube\.com|gayforit\.eu|boyfriendtv\.com|men\.com|cockyboys\.com|seancody\.com|helixstudios\.com|nextdoorstudios\.com|icon-male\.com|extrabigdicks\.com|randyblue\.com|corbinfisher\.com|chaos-men\.com|chaosmen\.com|activeduty\.com|militaryclassified\.com|americanmusclesexnet\.com|straightfraternity\.com|extrabigdicks\.com|hungyoungbrit\.com|collegeboyphysicals\.com|fraternity-x\.com|fratx\.com|sketchy-sex\.com|rawfuck\.club|twinktop\.com|funsizeboys\.com|familydick\.com|mormonboyz\.com|missionaryboys\.com|yesfather\.com|trojanmen\.com|stag-homme\.com|lucasentertainment\.com|rawcastings\.com|muscle-hunks\.com|legendmen\.com|hotolder\.com|hairyandraw\.com|disruptivefilms\.com|nextdoorraw\.com|men-first-time\.com|gayroom\.com|menover30\.com|dylanlucas\.com|icongay\.com|transangels\.com|grooby\.com|tgirlnetwork\.com|transsensual\.com|kink\.com|boundgods\.com|nakedkombat\.com|builtforthis\.com|meninpain\.com|whippedass\.com|hogtied\.com|devicebondage\.com|theupperfloor\.com|publicdisgrace\.com|boundgangbangs\.com)[^\s<>"']*)/gi;
    
    const matches = text.match(urlRegex) || [];
    
    // Also try to extract from lines that might be formatted differently
    const lines = text.split('\n');
    const additionalUrls: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('http') && !matches.some(match => match.includes(trimmed))) {
        additionalUrls.push(trimmed);
      }
    });
    
    return [...matches, ...additionalUrls].filter((url, index, arr) => 
      arr.indexOf(url) === index // Remove duplicates
    );
  };

  const extractTitle = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // ThisVid URLs
      if (url.includes('thisvid.com')) {
        const match = pathname.match(/\/videos?\/(.+)/);
        if (match) {
          return decodeURIComponent(match[1]).replace(/-/g, ' ').replace(/\//g, ' ');
        }
      }
      
      // PornHub URLs
      if (url.includes('pornhub.com')) {
        const match = pathname.match(/\/view_video\.php/) || pathname.match(/\/videos?\/.+/);
        if (match) {
          const title = pathname.split('/').pop() || '';
          return decodeURIComponent(title).replace(/-/g, ' ');
        }
      }
      
      // XVideos URLs
      if (url.includes('xvideos.com')) {
        const match = pathname.match(/\/video\d+\/(.+)/);
        if (match) {
          return decodeURIComponent(match[1]).replace(/_/g, ' ').replace(/-/g, ' ');
        }
      }
      
      // Generic extraction for other sites
      const segments = pathname.split('/').filter(segment => segment.length > 0);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        return decodeURIComponent(lastSegment).replace(/[-_]/g, ' ');
      }
      
      return `Video from ${urlObj.hostname}`;
    } catch (error) {
      return `Video from ${url.substring(0, 30)}...`;
    }
  };

  const handleImport = async () => {
    if (!urls.trim()) return;

    const urlList = extractUrls(urls);
    
    if (urlList.length === 0) {
      alert("No valid URLs found. Please paste video URLs from supported platforms.");
      return;
    }

    if (urlList.length > 500) {
      alert("Maximum 500 URLs per import. Please split into smaller batches.");
      return;
    }

    setIsImporting(true);
    setResults([]);
    setProgress(0);

    const importResults: ImportResult[] = [];

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      setCurrentUrl(url);
      setProgress((i / urlList.length) * 100);

      try {
        const title = extractTitle(url);
        
        const response = await fetch('/api/videos/url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            videoUrl: url,
            isExternal: true,
            tags: ['imported', 'bulk'],
            categories: ['adult']
          }),
        });

        if (response.ok) {
          const video = await response.json();
          importResults.push({
            url,
            success: true,
            title: video.title || title,
            videoId: video.id
          });
        } else {
          const error = await response.json();
          importResults.push({
            url,
            success: false,
            error: error.message || `HTTP ${response.status}`,
            title
          });
        }
      } catch (error) {
        importResults.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          title: extractTitle(url)
        });
      }

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setProgress(100);
    setResults(importResults);
    setIsImporting(false);
    setCurrentUrl("");
    
    if (onImportComplete) {
      onImportComplete(importResults);
    }
  };

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-400">
            <Upload className="w-5 h-5" />
            Bulk URL Import
          </CardTitle>
          <p className="text-slate-300 text-sm">
            Import up to 500 video URLs at once from supported platforms. Paste URLs directly or import from browser bookmarks.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Video URLs (one per line or comma-separated)
            </label>
            <Textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={`Paste video URLs here, for example:
https://www.thisvid.com/videos/hot-muscle-guys/
https://www.pornhub.com/view_video.php?viewkey=abc123
https://www.xvideos.com/video123/amazing-video/

Supports: ThisVid, PornHub, XVideos, RedTube, XHamster, and many more...`}
              className="min-h-[150px] bg-slate-900 border-slate-600 text-white"
              disabled={isImporting}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {urls.trim() ? `${extractUrls(urls).length} URLs detected` : 'No URLs detected'}
            </div>
            <Button
              onClick={handleImport}
              disabled={isImporting || !urls.trim() || extractUrls(urls).length === 0}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isImporting ? 'Importing...' : 'Start Import'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isImporting && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Import Progress</span>
                <span className="text-sm text-slate-400">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {currentUrl && (
                <div className="text-xs text-slate-400 truncate">
                  Currently processing: {currentUrl}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-white">Import Results</span>
              <div className="flex gap-2">
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {successCount} Success
                </Badge>
                {failureCount > 0 && (
                  <Badge className="bg-red-600 text-white">
                    <XCircle className="w-3 h-3 mr-1" />
                    {failureCount} Failed
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    result.success
                      ? "bg-green-900/20 border-green-700/50"
                      : "bg-red-900/20 border-red-700/50"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm">
                      {result.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                      <Link className="w-3 h-3" />
                      {result.url}
                    </div>
                    {result.error && (
                      <div className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
