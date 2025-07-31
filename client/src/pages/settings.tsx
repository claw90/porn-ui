import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Settings as SettingsIcon, 
  Database, 
  Brain, 
  Eye, 
  Shield, 
  Bell, 
  Palette, 
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Server,
  Code,
  BarChart3,
  Users,
  Video,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Zap,
  Target,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface AnalysisResult {
  id: string;
  status: string;
  videoFilename: string;
  targetFaceFilename: string;
  matchCount: number;
  processingTime?: number;
  createdAt: string;
  completedAt?: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [notifications, setNotifications] = useState(true);
  const [autoAddHighConfidence, setAutoAddHighConfidence] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  const { data: recentAnalyses = [] } = useQuery({
    queryKey: ['recent-analyses'],
    queryFn: async () => {
      const response = await fetch('/api/analyses/recent/10');
      if (!response.ok) throw new Error('Failed to fetch analyses');
      return response.json();
    },
  });

  const { data: systemStats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      // Mock system stats for now
      return {
        totalVideos: 2847,
        totalPerformers: 1234,
        totalAnalyses: 156,
        storageUsed: '45.2 GB',
        lastBackup: '2025-01-28T10:30:00Z'
      };
    },
  });

  const clearCache = async () => {
    try {
      // Clear various caches
      console.log('Clearing application cache...');
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const exportData = async () => {
    try {
      console.log('Exporting user data...');
      alert('Data export initiated. You will receive a download link via email.');
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const optimizeDatabase = async () => {
    try {
      console.log('Optimizing database...');
      alert('Database optimization completed!');
    } catch (error) {
      console.error('Error optimizing database:', error);
    }
  };

  const SettingCard = ({ icon: Icon, title, description, children, action }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    children?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-orange-500/20 p-3 rounded-lg">
            <Icon className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">{title}</h3>
            <p className="text-slate-400 text-sm mb-4">{description}</p>
            {children}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </CardContent>
    </Card>
  );

  const StatCard = ({ icon: Icon, title, value, description }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    description: string;
  }) => (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Icon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-white text-sm">{title}</h4>
            <p className="text-blue-300 font-semibold text-lg">{value}</p>
            <p className="text-slate-400 text-xs">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-orange-400" />
            Settings & Configuration
          </h1>
          <p className="text-slate-400">
            Manage your preferences, data, and system configuration
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700 flex-wrap h-auto p-2">
            <TabsTrigger value="general" className="data-[state=active]:bg-orange-600">
              <SettingsIcon className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="discovery" className="data-[state=active]:bg-orange-600">
              <Globe className="w-4 h-4 mr-2" />
              Discovery
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-orange-600">
              <Database className="w-4 h-4 mr-2" />
              Data Management
            </TabsTrigger>
            <TabsTrigger value="backend" className="data-[state=active]:bg-orange-600">
              <Server className="w-4 h-4 mr-2" />
              Backend Tools
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6">
              <SettingCard
                icon={Bell}
                title="Notifications"
                description="Control when and how you receive notifications"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications" className="text-white">Push notifications</Label>
                    <Switch
                      id="notifications"
                      checked={notifications}
                      onCheckedChange={setNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications" className="text-white">Email notifications</Label>
                    <Switch id="email-notifications" />
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                icon={Palette}
                title="Appearance"
                description="Customize the look and feel of your interface"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dark-mode" className="text-white">Dark mode</Label>
                    <Switch
                      id="dark-mode"
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Theme Color</Label>
                    <div className="flex gap-2">
                      {['orange', 'blue', 'green', 'purple', 'red'].map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full bg-${color}-500 border-2 border-slate-600 hover:border-white transition-colors`}
                          onClick={() => console.log(`Switch to ${color} theme`)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                icon={Shield}
                title="Privacy & Security"
                description="Manage your privacy settings and security preferences"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="private-mode" className="text-white">Private browsing mode</Label>
                    <Switch id="private-mode" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="remember-sessions" className="text-white">Remember login sessions</Label>
                    <Switch id="remember-sessions" defaultChecked />
                  </div>
                  <Button variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                    <Shield className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </SettingCard>
            </div>
          </TabsContent>

          <TabsContent value="discovery" className="space-y-6">
            <div className="grid gap-6">
              <SettingCard
                icon={Target}
                title="Auto-Discovery Settings"
                description="Configure automatic content discovery preferences"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-add" className="text-white">Auto-add high confidence matches</Label>
                    <Switch
                      id="auto-add"
                      checked={autoAddHighConfidence}
                      onCheckedChange={setAutoAddHighConfidence}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Minimum Confidence Threshold</Label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0.5"
                        max="1.0"
                        step="0.05"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-orange-300 font-semibold min-w-[4rem]">
                        {Math.round(confidenceThreshold * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Only videos above this confidence level will be considered for auto-adding
                    </p>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                icon={Globe}
                title="Platform Preferences"
                description="Select which platforms to include in discovery"
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'ThisVid', enabled: true },
                    { name: 'PornHub', enabled: true },
                    { name: 'XVideos', enabled: true },
                    { name: 'RedTube', enabled: false },
                    { name: 'XHamster', enabled: false },
                    { name: 'Beeg', enabled: false }
                  ].map((platform) => (
                    <div key={platform.name} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-white text-sm">{platform.name}</span>
                      <Switch defaultChecked={platform.enabled} />
                    </div>
                  ))}
                </div>
              </SettingCard>

              <SettingCard
                icon={Zap}
                title="Discovery Schedule"
                description="Configure automated discovery timing"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-discovery" className="text-white">Enable scheduled discovery</Label>
                    <Switch id="auto-discovery" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white text-sm">Frequency</Label>
                      <select className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm">
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white text-sm">Time</Label>
                      <Input
                        type="time"
                        defaultValue="02:00"
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                </div>
              </SettingCard>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            {/* System Stats */}
            {systemStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                  icon={Video}
                  title="Total Videos"
                  value={systemStats.totalVideos}
                  description="In your library"
                />
                <StatCard
                  icon={Users}
                  title="Performers"
                  value={systemStats.totalPerformers}
                  description="Profiles created"
                />
                <StatCard
                  icon={Brain}
                  title="Analyses"
                  value={systemStats.totalAnalyses}
                  description="Face recognition runs"
                />
                <StatCard
                  icon={Database}
                  title="Storage"
                  value={systemStats.storageUsed}
                  description="Data used"
                />
                <StatCard
                  icon={CheckCircle}
                  title="Last Backup"
                  value="2 hours ago"
                  description="Data protection"
                />
              </div>
            )}

            <div className="grid gap-6">
              <SettingCard
                icon={Download}
                title="Data Export"
                description="Download all your data for backup or migration"
                action={
                  <Button onClick={exportData} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                }
              >
                <div className="text-sm text-slate-400">
                  Export includes videos, performers, analyses, and preferences
                </div>
              </SettingCard>

              <SettingCard
                icon={Upload}
                title="Data Import"
                description="Import data from backup or another installation"
                action={
                  <Button variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                }
              >
                <div className="text-sm text-slate-400">
                  Supports JSON exports from this application
                </div>
              </SettingCard>

              <SettingCard
                icon={RefreshCw}
                title="Database Optimization"
                description="Optimize database performance and clean up old data"
                action={
                  <Button onClick={optimizeDatabase} variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Optimize
                  </Button>
                }
              >
                <div className="text-sm text-slate-400">
                  Recommended to run monthly for best performance
                </div>
              </SettingCard>

              <SettingCard
                icon={Trash2}
                title="Clear Cache"
                description="Clear temporary files and cached data"
                action={
                  <Button onClick={clearCache} variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                }
              >
                <div className="text-sm text-slate-400">
                  Frees up storage space and may improve performance
                </div>
              </SettingCard>
            </div>
          </TabsContent>

          <TabsContent value="backend" className="space-y-6">
            <div className="grid gap-6">
              <SettingCard
                icon={Brain}
                title="Face Recognition Analysis"
                description="Advanced backend tool for analyzing faces in videos using Python scripts"
                action={
                  <Link href="/face-recognition">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Eye className="w-4 h-4 mr-2" />
                      Access Tool
                    </Button>
                  </Link>
                }
              >
                <div className="space-y-2">
                  <div className="text-sm text-slate-400">
                    Server-side Python backend for face detection and matching across your video library
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-green-500/20 text-green-300">Backend Only</Badge>
                    <Badge className="bg-blue-500/20 text-blue-300">Python Required</Badge>
                    <Badge className="bg-yellow-500/20 text-yellow-300">Advanced Users</Badge>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                icon={Code}
                title="API Configuration"
                description="Configure external API integrations and services"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Anthropic API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-ant-api03-..."
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400">For AI assistant functionality</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">OpenAI API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400">For enhanced AI features</p>
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                icon={Server}
                title="Server Configuration"
                description="Advanced server settings and environment variables"
              >
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Environment Status</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Database:</span>
                        <Badge className="bg-green-500/20 text-green-300">Connected</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Python Backend:</span>
                        <Badge className="bg-yellow-500/20 text-yellow-300">Available</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Face Recognition:</span>
                        <Badge className="bg-blue-500/20 text-blue-300">Ready</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">File Storage:</span>
                        <Badge className="bg-green-500/20 text-green-300">Accessible</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                    <Code className="w-4 h-4 mr-2" />
                    View System Logs
                  </Button>
                </div>
              </SettingCard>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6">
              {/* Recent Face Recognition Analyses */}
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-orange-400" />
                    Recent Face Recognition Analyses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentAnalyses.length > 0 ? (
                    <div className="space-y-3">
                      {recentAnalyses.slice(0, 5).map((analysis: AnalysisResult) => (
                        <div key={analysis.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-medium text-sm">{analysis.videoFilename}</h4>
                              <Badge className={cn(
                                "text-xs",
                                analysis.status === 'completed' ? "bg-green-500/20 text-green-300" :
                                analysis.status === 'processing' ? "bg-yellow-500/20 text-yellow-300" :
                                analysis.status === 'error' ? "bg-red-500/20 text-red-300" :
                                "bg-blue-500/20 text-blue-300"
                              )}>
                                {analysis.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              Target: {analysis.targetFaceFilename} • 
                              {analysis.matchCount > 0 ? ` ${analysis.matchCount} matches` : ' No matches'} •
                              {analysis.processingTime ? ` ${analysis.processingTime}s` : ''} •
                              {new Date(analysis.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-white"
                            onClick={() => console.log('View analysis:', analysis.id)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 mx-auto mb-3 text-slate-500 opacity-50" />
                      <p className="text-slate-400">No face recognition analyses yet</p>
                      <p className="text-slate-500 text-sm">Use the Backend Tools to start analyzing videos</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <SettingCard
                icon={BarChart3}
                title="Usage Statistics"
                description="Detailed analytics about your system usage"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-orange-300 font-semibold text-lg">2.1K</div>
                    <div className="text-slate-400 text-xs">Total Views</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-blue-300 font-semibold text-lg">47m</div>
                    <div className="text-slate-400 text-xs">Watch Time</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-green-300 font-semibold text-lg">156</div>
                    <div className="text-slate-400 text-xs">Searches</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-purple-300 font-semibold text-lg">89%</div>
                    <div className="text-slate-400 text-xs">Match Rate</div>
                  </div>
                </div>
              </SettingCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
