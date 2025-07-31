import React, { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CollapsibleSidebar from "@/components/CollapsibleSidebar";
// import { AIAssistant, AIAssistantButton } from "@/components/AIAssistant";
import Home from "@/pages/home";
import Library from "@/pages/library";
import Performers from "@/pages/performers";
import Recommendations from "@/pages/recommendations";
import Discovery from "@/pages/discovery";
import Settings from "@/pages/settings";
import FaceRecognition from "@/pages/face-recognition";
import NotFound from "@/pages/not-found";

function Router() {
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  const handleToggleAIAssistant = () => {
    setIsAIAssistantOpen(!isAIAssistantOpen);
  };

  const handleCloseAIAssistant = () => {
    setIsAIAssistantOpen(false);
  };

  return (
    <>
      <CollapsibleSidebar>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/library" component={Library} />
          <Route path="/performers" component={Performers} />
          <Route path="/recommendations" component={Recommendations} />
          <Route path="/discovery" component={Discovery} />
          <Route path="/face-recognition" component={FaceRecognition} />
          <Route path="/collections" component={NotFound} />
          <Route path="/analytics" component={NotFound} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </CollapsibleSidebar>

      {/* AI Assistant Components - Disabled for now */}
      {/*
      <AIAssistantButton 
        onClick={handleToggleAIAssistant} 
        isOpen={isAIAssistantOpen} 
      />
      <AIAssistant 
        isOpen={isAIAssistantOpen}
        onClose={handleCloseAIAssistant}
        onToggle={handleToggleAIAssistant}
      />
      */}
    </>
  );
}

function App() {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("App error:", error);
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1>Application Error</h1>
        <p>Please refresh the page</p>
      </div>
    );
  }
}

export default App;
