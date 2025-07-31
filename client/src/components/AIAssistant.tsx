import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Video, 
  Search, 
  Tag,
  Settings,
  X,
  Minimize2,
  Maximize2
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  videoRecommendations?: Array<{
    id: string;
    title: string;
    url: string;
    reasoning: string;
  }>;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function AIAssistant({ isOpen, onClose, onToggle }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Ensure window opens in full mode when first opened
  useEffect(() => {
    if (isOpen && isMinimized) {
      setIsMinimized(false);
    }
  }, [isOpen]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get user's video library for context
  const { data: videos = [] } = useQuery<any[]>({
    queryKey: ['/api/videos'],
  });

  // Get user preferences for context
  const { data: userPreferences } = useQuery({
    queryKey: ['/api/recommendations/demo-user/preferences'],
  });

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I'm your AI Assistant for Chris' Secret Stash. I can help you with:

• **Video Discovery** - Find new content based on your preferences
• **Smart Recommendations** - Get personalized suggestions
• **Content Organization** - Help tag and categorize your videos  
• **Search & Filter** - Find specific content in your library
• **System Features** - Learn how to use various tools

What would you like assistance with today?`,
        timestamp: new Date(),
        suggestions: [
          "Recommend videos similar to my favorites",
          "Help me organize my video library",
          "Find videos with specific performers",
          "Explain the recommendation system",
          "Show me trending content"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  // Send message to AI
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      console.log('Sending message to AI:', message);
      const response = await apiRequest('/api/ai-assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          userId: 'demo-user',
          context: {
            videoCount: videos.length,
            userPreferences,
            recentVideos: videos.slice(0, 5)
          }
        })
      });
      const data = await response.json();
      console.log('AI response:', data);
      return data;
    },
    onSuccess: (response) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
        videoRecommendations: response.videoRecommendations
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('AI Assistant error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      toast({
        title: "AI Assistant Error",
        description: "Unable to process your request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to AI
    setIsLoading(true);
    sendMessageMutation.mutate(inputMessage.trim());
    setInputMessage("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-4 bottom-4 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[700px]'
    }`}>
      <Card className="bg-gray-900 border-gray-700 shadow-2xl h-full flex flex-col overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="w-6 h-6 text-blue-400" />
                <Sparkles className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
              </div>
              <CardTitle className="text-white text-lg font-semibold">AI Assistant</CardTitle>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Online" />
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-400 hover:text-white p-1"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages */}
            <CardContent className="flex-1 p-0 min-h-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-blue-600' 
                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                      
                      <div className={`flex-1 max-w-[80%] ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        <div className={`rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-100'
                        }`}>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>

                        {/* Suggestions */}
                        {message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-gray-400">Suggestions:</div>
                            <div className="flex flex-wrap gap-2">
                              {message.suggestions.map((suggestion, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="cursor-pointer bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white transition-colors text-xs"
                                  onClick={() => handleSuggestionClick(suggestion)}
                                >
                                  {suggestion}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Video Recommendations */}
                        {message.videoRecommendations && message.videoRecommendations.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              Video Recommendations:
                            </div>
                            <div className="space-y-2">
                              {message.videoRecommendations.map((video) => (
                                <div key={video.id} className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                                  <div className="text-sm font-medium text-white">{video.title}</div>
                                  <div className="text-xs text-gray-400 mt-1">{video.reasoning}</div>
                                  <Button
                                    size="sm"
                                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-xs"
                                    onClick={() => window.open(video.url, '_blank')}
                                  >
                                    Watch Now
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            </div>
                            <span className="text-gray-400 text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>

            {/* Input */}
            <div className="border-t border-gray-700 p-4 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me anything about your video collection..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <MessageCircle className="w-3 h-3" />
                <span>Press Enter to send • AI powered by Claude</span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// Floating AI Assistant Button
export function AIAssistantButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
  return (
    <Button
      onClick={onClick}
      className={`fixed right-4 bottom-4 z-40 w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
        isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-110`}
    >
      <div className="relative">
        <Bot className="w-6 h-6 text-white" />
        <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1" />
      </div>
    </Button>
  );
}