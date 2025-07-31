import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Film, 
  Users, 
  FolderOpen, 
  Heart, 
  BarChart3, 
  Settings, 
  Search,
  Play,
  Star,
  Database,
  ChevronRight,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Face Recognition", href: "/face-recognition", icon: Search },
    ]
  },
  {
    title: "Content Management",
    items: [
      { name: "Video Library", href: "/library", icon: Film },
      { name: "AI Recommendations", href: "/recommendations", icon: Zap },
      { name: "Performers", href: "/performers", icon: Users },
      { name: "Collections", href: "/collections", icon: FolderOpen },
      { name: "Favorites", href: "/favorites", icon: Heart },
    ]
  },
  {
    title: "Analytics & Reports",
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
];

export function Navigation() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-full dark-gradient border-r border-border/50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 masculine-gradient rounded-lg flex items-center justify-center glow-primary">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold masculine-text-gradient">
              VideoHub Pro
            </h2>
            <p className="text-xs text-muted-foreground">Professional Video Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <nav className="space-y-6">
          {navigationItems.map((section) => (
            <div key={section.title}>
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location === item.href || 
                    (item.href !== "/" && location.startsWith(item.href));
                  
                  return (
                    <Link key={item.name} href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-left font-normal hover-glow mb-1 rounded-lg",
                          isActive && "nav-item-active masculine-gradient text-white font-semibold"
                        )}
                      >
                        <item.icon className={cn(
                          "mr-3 h-4 w-4",
                          isActive ? "text-white" : "text-muted-foreground group-hover:text-primary"
                        )} />
                        <span className={isActive ? "text-white" : "group-hover:text-foreground"}>
                          {item.name}
                        </span>
                        {isActive && (
                          <ChevronRight className="ml-auto h-4 w-4 text-white" />
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      
    </div>
  );
}