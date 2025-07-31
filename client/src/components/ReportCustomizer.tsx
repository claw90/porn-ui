import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Palette, 
  Layout, 
  Settings, 
  Download, 
  Eye, 
  Upload,
  Save,
  RotateCcw,
  Wand2,
  Image,
  BarChart3,
  Clock,
  FileImage,
  Type,
  Ruler,
  Layers
} from 'lucide-react';
import type { ReportConfiguration, ReportStyling } from '@shared/schema';

interface ReportCustomizerProps {
  analysisId?: string;
  onGenerateReport: (config: ReportConfiguration) => void;
  onPreviewReport: (config: ReportConfiguration) => void;
  onSaveTemplate: (config: ReportConfiguration, name: string) => void;
}

export function ReportCustomizer({ 
  analysisId, 
  onGenerateReport, 
  onPreviewReport, 
  onSaveTemplate 
}: ReportCustomizerProps) {
  const [config, setConfig] = useState<ReportConfiguration>({
    customTitle: 'Face Recognition Analysis Report',
    includeCharts: true,
    includeMatchThumbnails: true,
    includeTimeline: true,
    includeStatistics: true,
    includeMetadata: true,
    confidenceThreshold: 0.5,
    maxMatchesDisplay: 50,
    pageFormat: 'A4',
    orientation: 'portrait',
    theme: 'professional',
    exportFormats: ['pdf'],
    customStyles: {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      accentColor: '#10b981',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: { heading: 24, body: 14, caption: 12 },
      spacing: { section: 30, paragraph: 15, margin: 20 },
      borderRadius: 8,
      showBorders: true,
      showShadows: true,
    }
  });

  const [templateName, setTemplateName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const updateConfig = (updates: Partial<ReportConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateStyles = (updates: Partial<ReportStyling>) => {
    setConfig(prev => ({
      ...prev,
      customStyles: { ...prev.customStyles!, ...updates }
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateReport(config);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    onPreviewReport(config);
  };

  const handleSaveTemplate = () => {
    if (templateName.trim()) {
      onSaveTemplate(config, templateName);
      setTemplateName('');
    }
  };

  const resetToDefaults = () => {
    setConfig({
      customTitle: 'Face Recognition Analysis Report',
      includeCharts: true,
      includeMatchThumbnails: true,
      includeTimeline: true,
      includeStatistics: true,
      includeMetadata: true,
      confidenceThreshold: 0.5,
      maxMatchesDisplay: 50,
      pageFormat: 'A4',
      orientation: 'portrait',
      theme: 'professional',
      exportFormats: ['pdf'],
      customStyles: {
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        accentColor: '#10b981',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { heading: 24, body: 14, caption: 12 },
        spacing: { section: 30, paragraph: 15, margin: 20 },
        borderRadius: 8,
        showBorders: true,
        showShadows: true,
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="masculine-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Report Customization
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Customize your analysis report with advanced options for layout, styling, and content.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePreview} variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={!analysisId || isGenerating}
              className="masculine-gradient"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button onClick={resetToDefaults} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customization Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="content" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="styling" className="flex items-center gap-1">
            <Palette className="h-4 w-4" />
            Styling
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-1">
            <Layout className="h-4 w-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1">
            <Save className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Content Settings */}
        <TabsContent value="content" className="space-y-4">
          <Card className="masculine-card">
            <CardHeader>
              <CardTitle className="text-lg">Report Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Custom Title</Label>
                <Input
                  id="title"
                  value={config.customTitle || ''}
                  onChange={(e) => updateConfig({ customTitle: e.target.value })}
                  placeholder="Enter custom report title"
                  className="masculine-input"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Include Charts
                  </Label>
                  <Switch
                    checked={config.includeCharts}
                    onCheckedChange={(checked) => updateConfig({ includeCharts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Match Thumbnails
                  </Label>
                  <Switch
                    checked={config.includeMatchThumbnails}
                    onCheckedChange={(checked) => updateConfig({ includeMatchThumbnails: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline View
                  </Label>
                  <Switch
                    checked={config.includeTimeline}
                    onCheckedChange={(checked) => updateConfig({ includeTimeline: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Statistics
                  </Label>
                  <Switch
                    checked={config.includeStatistics}
                    onCheckedChange={(checked) => updateConfig({ includeStatistics: checked })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Confidence Threshold: {Math.round(config.confidenceThreshold * 100)}%</Label>
                  <Slider
                    value={[config.confidenceThreshold]}
                    onValueChange={([value]) => updateConfig({ confidenceThreshold: value })}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only matches above this confidence level will be included
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Maximum Matches to Display: {config.maxMatchesDisplay}</Label>
                  <Slider
                    value={[config.maxMatchesDisplay]}
                    onValueChange={([value]) => updateConfig({ maxMatchesDisplay: value })}
                    min={5}
                    max={200}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="watermark">Watermark Text (Optional)</Label>
                <Input
                  id="watermark"
                  value={config.watermark || ''}
                  onChange={(e) => updateConfig({ watermark: e.target.value })}
                  placeholder="Enter watermark text"
                  className="masculine-input"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Styling Settings */}
        <TabsContent value="styling" className="space-y-4">
          <Card className="masculine-card">
            <CardHeader>
              <CardTitle className="text-lg">Visual Styling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={config.theme} onValueChange={(value) => updateConfig({ theme: value as any })}>
                  <SelectTrigger className="masculine-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="branded">Branded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={{ backgroundColor: config.customStyles?.primaryColor }}
                    />
                    Primary Color
                  </Label>
                  <Input
                    type="color"
                    value={config.customStyles?.primaryColor}
                    onChange={(e) => updateStyles({ primaryColor: e.target.value })}
                    className="h-10 w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={{ backgroundColor: config.customStyles?.secondaryColor }}
                    />
                    Secondary Color
                  </Label>
                  <Input
                    type="color"
                    value={config.customStyles?.secondaryColor}
                    onChange={(e) => updateStyles({ secondaryColor: e.target.value })}
                    className="h-10 w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded border" 
                      style={{ backgroundColor: config.customStyles?.accentColor }}
                    />
                    Accent Color
                  </Label>
                  <Input
                    type="color"
                    value={config.customStyles?.accentColor}
                    onChange={(e) => updateStyles({ accentColor: e.target.value })}
                    className="h-10 w-full"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Font Family
                </Label>
                <Select 
                  value={config.customStyles?.fontFamily} 
                  onValueChange={(value) => updateStyles({ fontFamily: value })}
                >
                  <SelectTrigger className="masculine-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system-ui, -apple-system, sans-serif">System Default</SelectItem>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                    <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                    <SelectItem value="Courier New, monospace">Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Heading Size: {config.customStyles?.fontSize.heading}px</Label>
                  <Slider
                    value={[config.customStyles?.fontSize.heading || 24]}
                    onValueChange={([value]) => updateStyles({ 
                      fontSize: { ...config.customStyles!.fontSize, heading: value }
                    })}
                    min={16}
                    max={36}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Body Size: {config.customStyles?.fontSize.body}px</Label>
                  <Slider
                    value={[config.customStyles?.fontSize.body || 14]}
                    onValueChange={([value]) => updateStyles({ 
                      fontSize: { ...config.customStyles!.fontSize, body: value }
                    })}
                    min={10}
                    max={20}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Caption Size: {config.customStyles?.fontSize.caption}px</Label>
                  <Slider
                    value={[config.customStyles?.fontSize.caption || 12]}
                    onValueChange={([value]) => updateStyles({ 
                      fontSize: { ...config.customStyles!.fontSize, caption: value }
                    })}
                    min={8}
                    max={16}
                    step={1}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Show Borders
                  </Label>
                  <Switch
                    checked={config.customStyles?.showBorders}
                    onCheckedChange={(checked) => updateStyles({ showBorders: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    Show Shadows
                  </Label>
                  <Switch
                    checked={config.customStyles?.showShadows}
                    onCheckedChange={(checked) => updateStyles({ showShadows: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Border Radius: {config.customStyles?.borderRadius}px
                </Label>
                <Slider
                  value={[config.customStyles?.borderRadius || 8]}
                  onValueChange={([value]) => updateStyles({ borderRadius: value })}
                  min={0}
                  max={20}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Settings */}
        <TabsContent value="layout" className="space-y-4">
          <Card className="masculine-card">
            <CardHeader>
              <CardTitle className="text-lg">Page Layout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Format</Label>
                  <Select 
                    value={config.pageFormat} 
                    onValueChange={(value) => updateConfig({ pageFormat: value as any })}
                  >
                    <SelectTrigger className="masculine-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select 
                    value={config.orientation} 
                    onValueChange={(value) => updateConfig({ orientation: value as any })}
                  >
                    <SelectTrigger className="masculine-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Spacing</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Section: {config.customStyles?.spacing.section}px</Label>
                    <Slider
                      value={[config.customStyles?.spacing.section || 30]}
                      onValueChange={([value]) => updateStyles({ 
                        spacing: { ...config.customStyles!.spacing, section: value }
                      })}
                      min={10}
                      max={60}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Paragraph: {config.customStyles?.spacing.paragraph}px</Label>
                    <Slider
                      value={[config.customStyles?.spacing.paragraph || 15]}
                      onValueChange={([value]) => updateStyles({ 
                        spacing: { ...config.customStyles!.spacing, paragraph: value }
                      })}
                      min={5}
                      max={40}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Margin: {config.customStyles?.spacing.margin}px</Label>
                    <Slider
                      value={[config.customStyles?.spacing.margin || 20]}
                      onValueChange={([value]) => updateStyles({ 
                        spacing: { ...config.customStyles!.spacing, margin: value }
                      })}
                      min={10}
                      max={50}
                      step={5}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Settings */}
        <TabsContent value="export" className="space-y-4">
          <Card className="masculine-card">
            <CardHeader>
              <CardTitle className="text-lg">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Export Formats</Label>
                <div className="flex flex-wrap gap-2">
                  {['pdf', 'html', 'docx', 'excel'].map((format) => (
                    <Badge
                      key={format}
                      variant={config.exportFormats.includes(format as any) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const formats = config.exportFormats.includes(format as any)
                          ? config.exportFormats.filter(f => f !== format)
                          : [...config.exportFormats, format as any];
                        updateConfig({ exportFormats: formats });
                      }}
                    >
                      {format.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="logo">Logo Upload (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    className="masculine-input"
                  />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a logo to include in the report header
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Card className="masculine-card">
            <CardHeader>
              <CardTitle className="text-lg">Save & Load Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="masculine-input"
                />
                <Button 
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="masculine-gradient"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Built-in Templates</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Professional Report', theme: 'professional' },
                    { name: 'Dark Theme', theme: 'dark' },
                    { name: 'Minimal Style', theme: 'minimal' },
                    { name: 'Branded Design', theme: 'branded' }
                  ].map((template) => (
                    <Button
                      key={template.name}
                      variant="outline"
                      className="justify-start"
                      onClick={() => updateConfig({ theme: template.theme as any })}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}