import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MapPin, Calendar, TrendingUp, ThermometerSun, CreditCard, Zap,
  Database, Brain, Search, Filter, Star, Download, Play, Edit, Eye,
  BarChart3, Globe, Users, ShoppingCart, MessageSquare, Camera,
  FileText, Music, Video, Code, Palette, Wrench, Shield, Settings
} from "lucide-react";

interface AgentApp {
  id: string;
  name: string;
  description: string;
  category: string;
  modules: string[];
  popularity: number;
  rating: number;
  downloads: number;
  author: string;
  version: string;
  price: number;
  features: string[];
  capabilities: string[];
  tags: string[];
  lastUpdated: string;
  icon: string;
}

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  apiEndpoints: number;
  integrations: string[];
  icon: string;
}

export default function AgentAppCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");
  const [selectedTab, setSelectedTab] = useState("apps");
  const [selectedApp, setSelectedApp] = useState<AgentApp | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit">("view");

  // Mock data for demonstration - this would come from your API
  const agentApps: AgentApp[] = [
    {
      id: "location-concierge",
      name: "Location-Aware Concierge",
      description: "AI-powered assistant that provides personalized recommendations based on your location, weather, and local events.",
      category: "Travel & Local",
      modules: ["Geospatial Analysis", "Weather Intelligence", "Event Discovery", "Recommendation Engine"],
      popularity: 95,
      rating: 4.8,
      downloads: 12500,
      author: "TravelTech AI",
      version: "2.1.0",
      price: 0,
      features: ["Real-time location tracking", "Weather-based suggestions", "Event recommendations", "Multi-language support"],
      capabilities: ["Location processing", "Weather data analysis", "Event discovery", "Natural language interaction"],
      tags: ["travel", "location", "recommendations", "weather", "events"],
      lastUpdated: "2024-01-15",
      icon: "🗺️"
    },
    {
      id: "event-marketing-optimizer",
      name: "Event Marketing Optimizer",
      description: "Comprehensive marketing intelligence platform that analyzes trends, optimizes campaigns, and predicts audience engagement.",
      category: "Marketing & Analytics",
      modules: ["Trend Analysis", "Social Media Intelligence", "Audience Segmentation", "Campaign Optimizer"],
      popularity: 88,
      rating: 4.6,
      downloads: 8750,
      author: "MarketingAI Pro",
      version: "1.8.2",
      price: 29.99,
      features: ["Real-time trend analysis", "Multi-platform integration", "Automated A/B testing", "ROI prediction"],
      capabilities: ["Trend detection", "Social sentiment analysis", "Campaign optimization", "Audience targeting"],
      tags: ["marketing", "analytics", "trends", "social media", "campaigns"],
      lastUpdated: "2024-01-12",
      icon: "📈"
    },
    {
      id: "financial-advisor-ai",
      name: "Financial Advisor AI",
      description: "Personal finance management system with spending analysis, investment recommendations, and budget optimization.",
      category: "Finance",
      modules: ["Financial Analysis", "Investment Intelligence", "Budget Optimizer", "Risk Assessment"],
      popularity: 82,
      rating: 4.7,
      downloads: 15200,
      author: "FinanceAI Labs",
      version: "3.0.1",
      price: 19.99,
      features: ["Spending categorization", "Investment suggestions", "Risk analysis", "Goal tracking"],
      capabilities: ["Financial data processing", "Investment analysis", "Risk modeling", "Budget planning"],
      tags: ["finance", "investment", "budgeting", "analysis", "planning"],
      lastUpdated: "2024-01-18",
      icon: "💰"
    },
    {
      id: "weather-prediction-system",
      name: "Weather Prediction System",
      description: "Advanced weather forecasting with climate analysis, severe weather alerts, and agricultural insights.",
      category: "Weather & Environment",
      modules: ["Weather Intelligence", "Climate Analysis", "Agricultural Intelligence", "Alert System"],
      popularity: 76,
      rating: 4.5,
      downloads: 6800,
      author: "WeatherTech Solutions",
      version: "2.3.0",
      price: 15.00,
      features: ["15-day forecasts", "Severe weather alerts", "Agricultural insights", "Climate patterns"],
      capabilities: ["Weather modeling", "Climate analysis", "Alert generation", "Agricultural planning"],
      tags: ["weather", "climate", "agriculture", "forecasting", "alerts"],
      lastUpdated: "2024-01-10",
      icon: "🌤️"
    },
    {
      id: "smart-content-curator",
      name: "Smart Content Curator",
      description: "AI-driven content discovery and curation platform with personalization and trend-based recommendations.",
      category: "Content & Media",
      modules: ["Content Intelligence", "Personalization Engine", "Trend Analysis", "Quality Assessment"],
      popularity: 91,
      rating: 4.9,
      downloads: 18900,
      author: "ContentAI Studio",
      version: "1.6.5",
      price: 0,
      features: ["Personalized feeds", "Content quality scoring", "Trend integration", "Multi-format support"],
      capabilities: ["Content analysis", "Personalization", "Trend detection", "Quality assessment"],
      tags: ["content", "curation", "personalization", "trends", "media"],
      lastUpdated: "2024-01-20",
      icon: "📱"
    }
  ];

  const modules: ModuleInfo[] = [
    {
      id: "geospatial-analysis",
      name: "Geospatial Analysis",
      description: "Advanced location processing with mapping, routing, and proximity analysis capabilities.",
      category: "Location Services",
      capabilities: ["GPS processing", "Map rendering", "Route optimization", "Geofencing", "Spatial queries"],
      apiEndpoints: 15,
      integrations: ["Google Maps", "OpenStreetMap", "Mapbox", "HERE Maps"],
      icon: "🗺️"
    },
    {
      id: "weather-intelligence",
      name: "Weather Intelligence",
      description: "Comprehensive weather data processing with forecasting and climate analysis.",
      category: "Environmental Data",
      capabilities: ["Weather forecasting", "Climate modeling", "Severe weather detection", "Agricultural insights"],
      apiEndpoints: 12,
      integrations: ["OpenWeatherMap", "AccuWeather", "Weather Underground", "NOAA"],
      icon: "🌤️"
    },
    {
      id: "event-discovery",
      name: "Event Discovery",
      description: "Real-time event aggregation from multiple sources with filtering and recommendation features.",
      category: "Event Management",
      capabilities: ["Event aggregation", "Calendar integration", "Recommendation filtering", "Social integration"],
      apiEndpoints: 8,
      integrations: ["Eventbrite", "Facebook Events", "Meetup", "Google Calendar"],
      icon: "📅"
    },
    {
      id: "trend-analysis",
      name: "Trend Analysis",
      description: "Market and social trend detection with sentiment analysis and prediction capabilities.",
      category: "Analytics",
      capabilities: ["Trend detection", "Sentiment analysis", "Prediction modeling", "Social monitoring"],
      apiEndpoints: 20,
      integrations: ["Twitter API", "Reddit API", "Google Trends", "News APIs"],
      icon: "📈"
    },
    {
      id: "recommendation-engine",
      name: "Recommendation Engine",
      description: "AI-powered recommendation system with collaborative filtering and content-based suggestions.",
      category: "Machine Learning",
      capabilities: ["Collaborative filtering", "Content analysis", "Personalization", "Real-time updates"],
      apiEndpoints: 10,
      integrations: ["TensorFlow", "PyTorch", "Apache Mahout", "Surprise"],
      icon: "🎯"
    },
    {
      id: "vector-memory",
      name: "Vector Memory",
      description: "Semantic similarity search and vector database operations for intelligent data retrieval.",
      category: "Data Storage",
      capabilities: ["Vector storage", "Similarity search", "Semantic indexing", "Real-time queries"],
      apiEndpoints: 6,
      integrations: ["Pinecone", "Weaviate", "Qdrant", "Chroma"],
      icon: "🧠"
    },
    {
      id: "financial-analysis",
      name: "Financial Analysis",
      description: "Comprehensive financial data processing with investment analysis and risk assessment.",
      category: "Finance",
      capabilities: ["Portfolio analysis", "Risk modeling", "Market data processing", "Trend prediction"],
      apiEndpoints: 18,
      integrations: ["Alpha Vantage", "IEX Cloud", "Quandl", "Yahoo Finance"],
      icon: "💰"
    },
    {
      id: "mcp-connector",
      name: "MCP Connector",
      description: "Universal API integration framework supporting multiple protocols and data formats.",
      category: "Integration",
      capabilities: ["API bridging", "Protocol translation", "Data transformation", "Error handling"],
      apiEndpoints: 25,
      integrations: ["REST APIs", "GraphQL", "WebSockets", "gRPC"],
      icon: "🔌"
    }
  ];

  const filteredApps = agentApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || app.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || module.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedApps = [...filteredApps].sort((a, b) => {
    switch (sortBy) {
      case "popularity": return b.popularity - a.popularity;
      case "rating": return b.rating - a.rating;
      case "downloads": return b.downloads - a.downloads;
      case "recent": return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      default: return 0;
    }
  });

  const categories = ["all", ...Array.from(new Set([
    ...agentApps.map(app => app.category),
    ...modules.map(module => module.category)
  ]))];

  const getAppIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      "🗺️": <MapPin className="w-6 h-6" />,
      "📈": <TrendingUp className="w-6 h-6" />,
      "💰": <CreditCard className="w-6 h-6" />,
      "🌤️": <ThermometerSun className="w-6 h-6" />,
      "📱": <MessageSquare className="w-6 h-6" />
    };
    return iconMap[iconName] || <Zap className="w-6 h-6" />;
  };

  const getModuleIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      "🗺️": <MapPin className="w-5 h-5" />,
      "🌤️": <ThermometerSun className="w-5 h-5" />,
      "📅": <Calendar className="w-5 h-5" />,
      "📈": <TrendingUp className="w-5 h-5" />,
      "🎯": <Star className="w-5 h-5" />,
      "🧠": <Brain className="w-5 h-5" />,
      "💰": <CreditCard className="w-5 h-5" />,
      "🔌": <Database className="w-5 h-5" />
    };
    return iconMap[iconName] || <Wrench className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent App Catalog</h1>
          <p className="text-gray-600 mt-2">
            Discover and deploy intelligent agent applications with advanced modules
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search apps, modules, or capabilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popularity">Most Popular</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="downloads">Most Downloaded</SelectItem>
            <SelectItem value="recent">Recently Updated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apps">Agent Applications ({filteredApps.length})</TabsTrigger>
          <TabsTrigger value="modules">Advanced Modules ({filteredModules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedApps.map((app) => (
              <Card key={app.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getAppIcon(app.icon)}
                      <div>
                        <CardTitle className="text-lg">{app.name}</CardTitle>
                        <CardDescription className="text-sm">by {app.author}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">{app.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-3">{app.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{app.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-4 h-4 text-gray-400" />
                      <span>{app.downloads.toLocaleString()}</span>
                    </div>
                    <div className="text-gray-500">
                      v{app.version}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Included Modules:</div>
                    <div className="flex flex-wrap gap-1">
                      {app.modules.slice(0, 3).map(module => (
                        <Badge key={module} variant="outline" className="text-xs">
                          {module}
                        </Badge>
                      ))}
                      {app.modules.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{app.modules.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedApp(app);
                          setViewMode("view");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedApp(app);
                          setViewMode("edit");
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Play className="w-4 h-4 mr-1" />
                        Demo
                      </Button>
                      <Button size="sm">
                        Deploy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module) => (
              <Card key={module.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getModuleIcon(module.icon)}
                      <div>
                        <CardTitle className="text-lg">{module.name}</CardTitle>
                        <CardDescription>{module.category}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{module.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">API Endpoints</div>
                      <div className="text-gray-600">{module.apiEndpoints}</div>
                    </div>
                    <div>
                      <div className="font-medium">Integrations</div>
                      <div className="text-gray-600">{module.integrations.length}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Capabilities:</div>
                    <div className="flex flex-wrap gap-1">
                      {module.capabilities.slice(0, 4).map(capability => (
                        <Badge key={capability} variant="outline" className="text-xs">
                          {capability}
                        </Badge>
                      ))}
                      {module.capabilities.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{module.capabilities.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Integrations:</div>
                    <div className="text-xs text-gray-600">
                      {module.integrations.slice(0, 3).join(", ")}
                      {module.integrations.length > 3 && ` +${module.integrations.length - 3} more`}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button size="sm" variant="outline">
                      <Code className="w-4 h-4 mr-1" />
                      View Docs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Agent App Details Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {getAppIcon(selectedApp.icon)}
                  <div>
                    <div className="text-xl font-bold">{selectedApp.name}</div>
                    <div className="text-sm text-gray-500">by {selectedApp.author} • v{selectedApp.version}</div>
                  </div>
                  <Badge variant="secondary" className="ml-auto">{selectedApp.category}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedApp.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {viewMode === "view" ? (
                  // View Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="font-semibold">Rating</div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span>{selectedApp.rating}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="font-semibold">Downloads</div>
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4 text-gray-400" />
                          <span>{selectedApp.downloads.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="font-semibold">Last Updated</div>
                        <div>{new Date(selectedApp.lastUpdated).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Included Modules</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedApp.modules.map(module => (
                          <Badge key={module} variant="outline">{module}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Features</h4>
                      <ul className="space-y-1">
                        {selectedApp.features.map((feature, index) => (
                          <li key={index} className="text-sm text-gray-600">• {feature}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Capabilities</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedApp.capabilities.map(capability => (
                          <Badge key={capability} variant="secondary" className="text-xs">{capability}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedApp.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={() => setViewMode("edit")}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Application
                      </Button>
                      <Button variant="outline">
                        <Play className="w-4 h-4 mr-2" />
                        Run Demo
                      </Button>
                      <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Application Name</label>
                        <Input defaultValue={selectedApp.name} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <Select defaultValue={selectedApp.category}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Travel & Local">Travel & Local</SelectItem>
                            <SelectItem value="Marketing & Analytics">Marketing & Analytics</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Weather & Environment">Weather & Environment</SelectItem>
                            <SelectItem value="Content & Media">Content & Media</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <textarea 
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md resize-none"
                        rows={3}
                        defaultValue={selectedApp.description}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Author</label>
                      <Input defaultValue={selectedApp.author} className="mt-1" />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Version</label>
                      <Input defaultValue={selectedApp.version} className="mt-1" />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Features (one per line)</label>
                      <textarea 
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md resize-none"
                        rows={4}
                        defaultValue={selectedApp.features.join('\n')}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Capabilities (one per line)</label>
                      <textarea 
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md resize-none"
                        rows={4}
                        defaultValue={selectedApp.capabilities.join('\n')}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Tags (comma separated)</label>
                      <Input defaultValue={selectedApp.tags.join(', ')} className="mt-1" />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Included Modules</label>
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                        {modules.map(module => (
                          <div key={module.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={module.id}
                              defaultChecked={selectedApp.modules.includes(module.name)}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={module.id} className="text-sm">
                              {module.name} - {module.description}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button>
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setViewMode("view")}>
                        Cancel
                      </Button>
                      <Button variant="outline">
                        <Play className="w-4 h-4 mr-2" />
                        Test Configuration
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}