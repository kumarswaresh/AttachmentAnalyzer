import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, Play, Settings, Eye, Code, Database, MapPin, Calendar, 
  TrendingUp, Cloud, ThermometerSun, BarChart3, Shield, Zap,
  Cpu, Memory, Network, Activity, Users, Globe, Star, Heart,
  ShoppingCart, CreditCard, Target, Filter, AlertTriangle,
  CheckCircle, Clock, Workflow, Bot, Brain, MessageSquare
} from "lucide-react";

interface AgentApp {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
  executionCount?: number;
  rating?: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  modules: string[];
  author: string;
  compatibleModels: string[];
  estimatedCost: number;
  lastExecuted?: string;
}

interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'data' | 'processing' | 'integration' | 'ai' | 'storage';
  icon: string;
  capabilities: string[];
  requiredSecrets?: string[];
  configSchema: any;
}

export default function AgentAppCatalog() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedApp, setSelectedApp] = useState<AgentApp | null>(null);
  const [activeTab, setActiveTab] = useState("apps");

  // Fetch agent apps
  const { data: agentApps = [], isLoading: appsLoading } = useQuery({
    queryKey: ["/api/agent-apps"],
  });

  // Fetch available modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/modules"],
  });

  // Execute agent app mutation
  const executeAppMutation = useMutation({
    mutationFn: async ({ appId, input }: { appId: string; input: any }) => {
      return await apiRequest("POST", `/api/agent-apps/${appId}/execute`, { input });
    },
    onSuccess: (data) => {
      toast({
        title: "Agent App Executed",
        description: "Your agent app is now running. Check the monitoring page for real-time progress.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-apps"] });
    },
    onError: (error) => {
      toast({
        title: "Execution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Predefined advanced modules
  const advancedModules: ModuleDefinition[] = [
    {
      id: "geospatial-analysis",
      name: "Geospatial Analysis",
      description: "Location-based data processing and spatial analytics",
      category: "Data Processing",
      type: "processing",
      icon: "MapPin",
      capabilities: ["Location Analysis", "Route Optimization", "Proximity Search", "Geographic Clustering"],
      requiredSecrets: ["GOOGLE_MAPS_API_KEY"],
      configSchema: { type: "object", properties: { radius: { type: "number" }, unit: { type: "string" } } }
    },
    {
      id: "event-discovery",
      name: "Event Discovery",
      description: "Real-time event and festival tracking worldwide",
      category: "Data Integration",
      type: "integration",
      icon: "Calendar",
      capabilities: ["Event Search", "Festival Tracking", "Venue Analysis", "Ticket Integration"],
      requiredSecrets: ["EVENTBRITE_API_KEY", "TICKETMASTER_API_KEY"],
      configSchema: { type: "object", properties: { categories: { type: "array" }, location: { type: "string" } } }
    },
    {
      id: "weather-intelligence",
      name: "Weather Intelligence",
      description: "Advanced weather data and forecasting",
      category: "Data Integration",
      type: "data",
      icon: "ThermometerSun",
      capabilities: ["Current Weather", "Forecasting", "Historical Data", "Weather Alerts"],
      requiredSecrets: ["OPENWEATHER_API_KEY"],
      configSchema: { type: "object", properties: { units: { type: "string" }, forecast_days: { type: "number" } } }
    },
    {
      id: "trend-analysis",
      name: "Trend Analysis",
      description: "Market trends and social sentiment analysis",
      category: "AI Processing",
      type: "ai",
      icon: "TrendingUp",
      capabilities: ["Social Trends", "Market Analysis", "Sentiment Tracking", "Viral Content Detection"],
      requiredSecrets: ["TWITTER_API_KEY", "GOOGLE_TRENDS_API_KEY"],
      configSchema: { type: "object", properties: { timeframe: { type: "string" }, keywords: { type: "array" } } }
    },
    {
      id: "recommendation-engine",
      name: "Recommendation Engine",
      description: "AI-powered personalized recommendations",
      category: "AI Processing",
      type: "ai",
      icon: "Target",
      capabilities: ["Content Recommendations", "Product Suggestions", "User Matching", "Behavioral Analysis"],
      configSchema: { type: "object", properties: { algorithm: { type: "string" }, factors: { type: "array" } } }
    },
    {
      id: "vector-memory",
      name: "Vector Memory",
      description: "Semantic similarity search and long-term memory",
      category: "Storage",
      type: "storage",
      icon: "Memory",
      capabilities: ["Semantic Search", "Memory Storage", "Context Retrieval", "Knowledge Graphs"],
      configSchema: { type: "object", properties: { dimensions: { type: "number" }, similarity_threshold: { type: "number" } } }
    },
    {
      id: "mcp-connector",
      name: "MCP Connector",
      description: "Universal API and database integration",
      category: "Integration",
      type: "integration",
      icon: "Database",
      capabilities: ["API Integration", "Database Connectivity", "Data Transformation", "Real-time Sync"],
      configSchema: { type: "object", properties: { endpoint: { type: "string" }, auth_type: { type: "string" } } }
    },
    {
      id: "real-time-monitoring",
      name: "Real-time Monitoring",
      description: "Live agent processing and data flow visualization",
      category: "Monitoring",
      type: "processing",
      icon: "Activity",
      capabilities: ["Live Monitoring", "Performance Metrics", "Error Tracking", "Resource Usage"],
      configSchema: { type: "object", properties: { refresh_rate: { type: "number" }, alert_thresholds: { type: "object" } } }
    },
    {
      id: "financial-analysis",
      name: "Financial Analysis",
      description: "Financial data processing and spending analysis",
      category: "Data Processing",
      type: "processing",
      icon: "CreditCard",
      capabilities: ["Spending Analysis", "Budget Tracking", "Transaction Categorization", "Financial Insights"],
      requiredSecrets: ["PLAID_API_KEY", "STRIPE_API_KEY"],
      configSchema: { type: "object", properties: { categories: { type: "array" }, time_period: { type: "string" } } }
    },
    {
      id: "historical-data",
      name: "Historical Data",
      description: "Historical data analysis and pattern recognition",
      category: "Data Processing",
      type: "data",
      icon: "BarChart3",
      capabilities: ["Historical Analysis", "Pattern Recognition", "Time Series", "Comparative Analysis"],
      configSchema: { type: "object", properties: { time_range: { type: "string" }, granularity: { type: "string" } } }
    }
  ];

  // Sample agent apps with advanced capabilities
  const sampleAgentApps: AgentApp[] = [
    {
      id: "location-aware-concierge",
      name: "Location-Aware Concierge",
      description: "Intelligent travel and location-based recommendations using geospatial analysis",
      category: "Travel & Tourism",
      version: "2.1.0",
      status: "active",
      executionCount: 1247,
      rating: 4.8,
      isPublic: true,
      createdAt: "2024-01-15",
      updatedAt: "2024-03-01",
      tags: ["geospatial", "travel", "recommendations", "real-time"],
      modules: ["geospatial-analysis", "recommendation-engine", "weather-intelligence", "event-discovery"],
      author: "AI Travel Solutions",
      compatibleModels: ["gpt-4", "claude-3", "gemini-pro"],
      estimatedCost: 0.15,
      lastExecuted: "2024-03-01T14:30:00Z"
    },
    {
      id: "event-marketing-optimizer",
      name: "Event Marketing Optimizer",
      description: "AI-powered event discovery and marketing campaign optimization",
      category: "Marketing",
      version: "1.8.3",
      status: "active",
      executionCount: 892,
      rating: 4.6,
      isPublic: true,
      createdAt: "2024-02-01",
      updatedAt: "2024-02-28",
      tags: ["events", "marketing", "optimization", "social-media"],
      modules: ["event-discovery", "trend-analysis", "recommendation-engine", "real-time-monitoring"],
      author: "Marketing AI Labs",
      compatibleModels: ["gpt-4", "claude-3"],
      estimatedCost: 0.22,
      lastExecuted: "2024-02-28T16:45:00Z"
    },
    {
      id: "financial-advisor-ai",
      name: "Personal Financial Advisor",
      description: "Comprehensive financial analysis with spending insights and recommendations",
      category: "Finance",
      version: "3.2.1",
      status: "active",
      executionCount: 2156,
      rating: 4.9,
      isPublic: true,
      createdAt: "2024-01-01",
      updatedAt: "2024-03-02",
      tags: ["finance", "analysis", "budgeting", "insights"],
      modules: ["financial-analysis", "historical-data", "trend-analysis", "recommendation-engine"],
      author: "FinTech AI",
      compatibleModels: ["gpt-4", "claude-3", "gemini-pro"],
      estimatedCost: 0.18,
      lastExecuted: "2024-03-02T09:15:00Z"
    },
    {
      id: "weather-prediction-system",
      name: "Advanced Weather Prediction",
      description: "Multi-source weather intelligence with historical pattern analysis",
      category: "Weather & Climate",
      version: "1.5.2",
      status: "active",
      executionCount: 1543,
      rating: 4.7,
      isPublic: true,
      createdAt: "2024-01-20",
      updatedAt: "2024-02-25",
      tags: ["weather", "forecasting", "climate", "agriculture"],
      modules: ["weather-intelligence", "historical-data", "geospatial-analysis", "trend-analysis"],
      author: "Climate Tech Solutions",
      compatibleModels: ["gpt-4", "claude-3"],
      estimatedCost: 0.12,
      lastExecuted: "2024-02-25T11:20:00Z"
    },
    {
      id: "smart-content-curator",
      name: "Smart Content Curator",
      description: "AI content discovery and curation with trend analysis and personalization",
      category: "Content & Media",
      version: "2.0.4",
      status: "active",
      executionCount: 3201,
      rating: 4.5,
      isPublic: true,
      createdAt: "2024-01-10",
      updatedAt: "2024-03-01",
      tags: ["content", "curation", "trends", "personalization"],
      modules: ["trend-analysis", "recommendation-engine", "vector-memory", "real-time-monitoring"],
      author: "Content AI Studio",
      compatibleModels: ["gpt-4", "claude-3", "gemini-pro"],
      estimatedCost: 0.08,
      lastExecuted: "2024-03-01T13:45:00Z"
    }
  ];

  // Filter apps based on search and category
  const filteredApps = sampleAgentApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(sampleAgentApps.map(app => app.category)))];

  // Get module icon component
  const getModuleIcon = (iconName: string) => {
    const icons: { [key: string]: any } = {
      MapPin, Calendar, ThermometerSun, TrendingUp, Target, Memory, Database, Activity, CreditCard, BarChart3
    };
    const IconComponent = icons[iconName] || Database;
    return <IconComponent className="w-5 h-5" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleExecuteApp = (app: AgentApp) => {
    executeAppMutation.mutate({
      appId: app.id,
      input: {
        context: "user_initiated",
        timestamp: new Date().toISOString()
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent App Catalog</h1>
          <p className="text-gray-600 mt-2">
            Discover and deploy advanced AI agent applications with comprehensive modules
          </p>
        </div>
        <Button onClick={() => window.location.href = '/agent-app-builder'}>
          <Code className="w-4 h-4 mr-2" />
          Create New App
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apps">Agent Applications</TabsTrigger>
          <TabsTrigger value="modules">Available Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search agent apps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Apps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => (
              <Card key={app.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {app.description}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(app.status)}>
                      {app.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{app.category}</Badge>
                    <Badge variant="outline">v{app.version}</Badge>
                    {app.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">{app.rating}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Modules */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Modules</div>
                      <div className="flex flex-wrap gap-1">
                        {app.modules.slice(0, 3).map((moduleId) => {
                          const module = advancedModules.find(m => m.id === moduleId);
                          return module ? (
                            <Badge key={moduleId} variant="secondary" className="text-xs">
                              {module.name}
                            </Badge>
                          ) : null;
                        })}
                        {app.modules.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{app.modules.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Executions</div>
                        <div className="font-medium">{app.executionCount?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Est. Cost</div>
                        <div className="font-medium">${app.estimatedCost}/run</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleExecuteApp(app)}
                        disabled={executeAppMutation.isPending}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Execute
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{app.name}</DialogTitle>
                            <DialogDescription>{app.description}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm font-medium">Author</div>
                                <div className="text-sm text-gray-600">{app.author}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium">Compatible Models</div>
                                <div className="text-sm text-gray-600">
                                  {app.compatibleModels.join(", ")}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-sm font-medium mb-2">Included Modules</div>
                              <div className="grid grid-cols-1 gap-2">
                                {app.modules.map((moduleId) => {
                                  const module = advancedModules.find(m => m.id === moduleId);
                                  return module ? (
                                    <div key={moduleId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                      {getModuleIcon(module.icon)}
                                      <div>
                                        <div className="font-medium text-sm">{module.name}</div>
                                        <div className="text-xs text-gray-600">{module.description}</div>
                                      </div>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-medium mb-2">Tags</div>
                              <div className="flex flex-wrap gap-1">
                                {app.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advancedModules.map((module) => (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {getModuleIcon(module.icon)}
                    <div>
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {module.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{module.category}</Badge>
                    <Badge variant="secondary">{module.type}</Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Capabilities</div>
                      <div className="space-y-1">
                        {module.capabilities.slice(0, 3).map((capability) => (
                          <div key={capability} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {capability}
                          </div>
                        ))}
                        {module.capabilities.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{module.capabilities.length - 3} more capabilities
                          </div>
                        )}
                      </div>
                    </div>

                    {module.requiredSecrets && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Required Secrets</div>
                        <div className="space-y-1">
                          {module.requiredSecrets.map((secret) => (
                            <Badge key={secret} variant="outline" className="text-xs">
                              {secret}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button size="sm" variant="outline" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Module
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}