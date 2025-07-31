import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Video, 
  Users, 
  Settings, 
  FileText, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Wand2,
  BarChart3,
  Upload,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SITE_TEXT } from "@/config/siteText";

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  { icon: Home, label: "Playing Now", href: "/" },
  { icon: Video, label: SITE_TEXT.navigation.videoLibrary, href: "/library" },
  { icon: Wand2, label: SITE_TEXT.navigation.recommendations, href: "/recommendations" },
  { icon: Search, label: SITE_TEXT.navigation.discovery, href: "/discovery" },
  { icon: Users, label: SITE_TEXT.navigation.performers, href: "/performers" },
  { icon: Star, label: SITE_TEXT.navigation.collections, href: "/collections" },
  { icon: BarChart3, label: SITE_TEXT.navigation.analytics, href: "/analytics" },
  { icon: Settings, label: SITE_TEXT.navigation.settings, href: "/settings" }
];

interface CollapsibleSidebarProps {
  children: React.ReactNode;
}

export default function CollapsibleSidebar({ children }: CollapsibleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "relative flex flex-col bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-700 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-slate-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{SITE_TEXT.siteName}</h1>
                <p className="text-xs text-zinc-400">{SITE_TEXT.siteTagline}</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-slate-600 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            "absolute -right-3 top-20 z-10 h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 p-0",
            "flex items-center justify-center"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-zinc-400" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-zinc-400" />
          )}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          <TooltipProvider>
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              const linkContent = (
                <Link href={item.href}>
                  <div className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                    active 
                      ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 border border-orange-500/30" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                    isCollapsed ? "justify-center" : ""
                  )}>
                    <Icon className={cn(
                      "transition-colors duration-200",
                      active ? "text-orange-400" : "text-zinc-400 group-hover:text-white",
                      isCollapsed ? "w-5 h-5" : "w-4 h-4"
                    )} />
                    {!isCollapsed && (
                      <>
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-zinc-800 border-zinc-700">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{linkContent}</div>;
            })}
          </TooltipProvider>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          {!isCollapsed ? (
            <div className="text-center">
              <p className="text-xs text-zinc-500">Version 2.1.0</p>
              <p className="text-xs text-zinc-600">Professional Edition</p>
            </div>
          ) : (
            <div className="w-2 h-2 bg-green-500 rounded-full mx-auto"></div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}