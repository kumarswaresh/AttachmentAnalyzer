import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Network, 
  Database, 
  Settings, 
  Globe,
  Zap,
  Search,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  endpoint: string;
  status: 'connected' | 'disconnected' | 'testing';
  version: string;
  author: string;
  documentation?: string;
}

export default function MCPCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMCPServers();
  }, []);

  const loadMCPServers = async () => {
    try {
      const response = await fetch('/api/mcp/catalog');
      if (response.ok) {
        const servers = await response.json();
        setMcpServers(servers);
      } else {
        // Set default MCP servers for demonstration
        setMcpServers([
          {
            id: 'hotel-analytics',
            name: 'Hotel Analytics MCP',
            description: 'Real-time hotel booking data, analytics, and market insights for hospitality industry',
            category: 'analytics',
            capabilities: ['booking-data', 'market-analysis', 'period-reports', 'websocket-streaming'],
            endpoint: 'ws://localhost:5000/hotel-mcp',
            status: 'connected',
            version: '1.2.0',
            author: 'Agent Platform',
            documentation: '/docs/hotel-mcp'
          },
          {
            id: 'marketing-data',
            name: 'Marketing Data Server',
            description: 'Comprehensive marketing campaign data, competitor analysis, and trend insights',
            category: 'marketing',
            capabilities: ['campaign-analysis', 'competitor-data', 'trend-tracking', 'roi-metrics'],
            endpoint: 'http://localhost:5001/marketing-api',
            status: 'connected',
            version: '2.1.0',
            author: 'Agent Platform'
          },
          {
            id: 'google-trends',
            name: 'Google Trends Integration',
            description: 'Access Google Trends data for keyword research and market analysis',
            category: 'research',
            capabilities: ['keyword-trends', 'regional-data', 'related-queries', 'historical-data'],
            endpoint: 'https://trends.googleapis.com/trends/api',
            status: 'disconnected',
            version: '1.0.0',
            author: 'Google'
          },
          {
            id: 'social-analytics',
            name: 'Social Media Analytics',
            description: 'Social media engagement metrics and sentiment analysis across platforms',
            category: 'analytics',
            capabilities: ['engagement-metrics', 'sentiment-analysis', 'platform-integration', 'reporting'],
            endpoint: 'https://api.socialanalytics.com/v1',
            status: 'testing',
            version: '1.5.2',
            author: 'SocialAnalytics Inc'
          },
          {
            id: 'financial-data',
            name: 'Financial Data Provider',
            description: 'Real-time financial data, market prices, and economic indicators',
            category: 'finance',
            capabilities: ['market-data', 'price-feeds', 'economic-indicators', 'portfolio-analysis'],
            endpoint: 'https://api.financialdata.com/v2',
            status: 'disconnected',
            version: '2.0.1',
            author: 'FinData Corp'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load MCP servers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (server: MCPServer) => {
    setMcpServers(prev => prev.map(s => 
      s.id === server.id ? { ...s, status: 'testing' } : s
    ));

    try {
      const response = await fetch(`/api/mcp/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: server.id, endpoint: server.endpoint })
      });

      const result = await response.json();
      const newStatus = result.success ? 'connected' : 'disconnected';
      
      setMcpServers(prev => prev.map(s => 
        s.id === server.id ? { ...s, status: newStatus } : s
      ));

      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      setMcpServers(prev => prev.map(s => 
        s.id === server.id ? { ...s, status: 'disconnected' } : s
      ));
      
      toast({
        title: 'Connection Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    }
  };

  const categories = ['all', 'analytics', 'marketing', 'research', 'finance'];
  
  const filteredServers = mcpServers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         server.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'testing': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-red-100 text-red-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading MCP servers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Server Catalog</h1>
          <p className="text-muted-foreground">
            Browse and connect to Model Context Protocol servers for enhanced AI capabilities
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <a href="/mcp-protocol">
              <Settings className="h-4 w-4 mr-2" />
              MCP Protocol
            </a>
          </Button>
          <Button variant="outline" onClick={loadMCPServers}>
            <Network className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search MCP servers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Server Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServers.map((server) => (
          <Card key={server.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">{server.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(server.status)}
                  <Badge className={getStatusColor(server.status)}>
                    {server.status}
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-sm">
                {server.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {server.capabilities.map((capability) => (
                  <Badge key={capability} variant="outline" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Version:</span>
                  <span>{server.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Author:</span>
                  <span>{server.author}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category:</span>
                  <Badge variant="secondary" className="text-xs">
                    {server.category}
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => testConnection(server)}
                  disabled={server.status === 'testing'}
                  className="flex-1"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  {server.status === 'testing' ? 'Testing...' : 'Test'}
                </Button>
                {server.documentation && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={server.documentation} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServers.length === 0 && (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No MCP servers found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}