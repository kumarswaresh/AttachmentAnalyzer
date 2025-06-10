import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, Play, Code, Database, MessageSquare, Activity, 
  Plus, Search, Filter, Globe, Zap, Shield, 
  CheckCircle, XCircle, AlertCircle, Clock 
} from "lucide-react";

interface MCPItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  version: string;
  author: string;
  lastUpdated: string;
  downloads: number;
  rating: number;
  tags: string[];
  documentation: string;
  repository: string;
  license: string;
  featured: boolean;
}

interface MCPConnector {
  id: string;
  name: string;
  version: string;
  status: "connected" | "disconnected" | "error";
  description: string;
  capabilities: string[];
  lastActivity: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export default function MCPProtocol() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // MCP Catalog data
  const { data: mcpCatalog = [] } = useQuery<MCPItem[]>({
    queryKey: ["/api/mcp/catalog"],
    retry: false,
  });

  // MCP Connectors data
  const { data: connectors = [] } = useQuery<MCPConnector[]>({
    queryKey: ["/api/mcp-connectors"],
    retry: false,
  });

  const { data: toolsResponse } = useQuery({
    queryKey: ["/api/mcp/tools"],
    retry: false,
  });

  const tools = toolsResponse?.tools || [];

  const { data: resourcesResponse } = useQuery({
    queryKey: ["/api/mcp/resources"],
    retry: false,
  });

  const resources = resourcesResponse?.resources || [];

  const { data: capabilities } = useQuery({
    queryKey: ["/api/mcp/capabilities"],
    retry: false,
  });

  // Filter catalog items
  const filteredItems = mcpCatalog.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(mcpCatalog.map(item => item.category)))];

  const testConnectionMutation = useMutation({
    mutationFn: async (connectorId: string) => {
      return apiRequest("POST", `/api/mcp-connectors/${connectorId}/test`);
    },
    onSuccess: () => {
      toast({
        title: "Connection Test Successful",
        description: "MCP connector is working properly",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mcp-connectors"] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    },
  });

  const executeToolMutation = useMutation({
    mutationFn: async (data: { toolName: string; args: any }) => {
      return apiRequest("POST", "/api/mcp/tools/execute", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Tool Executed",
        description: "Tool executed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Tool Execution Failed",
        description: error.message || "Failed to execute tool",
        variant: "destructive",
      });
    },
  });

  const installMutation = useMutation({
    mutationFn: async (mcpId: string) => {
      return apiRequest("POST", `/api/mcp/install/${mcpId}`);
    },
    onSuccess: () => {
      toast({
        title: "MCP Installed",
        description: "MCP package installed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mcp-connectors"] });
    },
    onError: (error: any) => {
      toast({
        title: "Installation Failed",
        description: error.message || "Failed to install MCP package",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MCP Protocol & Catalog</h1>
          <p className="text-gray-600 mt-2">
            Discover, install, and manage Model Context Protocol packages and connections
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom MCP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom MCP Connection</DialogTitle>
              <DialogDescription>
                Configure a custom MCP connection with your own server
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Connection Name</Label>
                <Input id="name" placeholder="My Custom MCP" />
              </div>
              <div>
                <Label htmlFor="endpoint">Server Endpoint</Label>
                <Input id="endpoint" placeholder="ws://localhost:8080" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Description of this MCP connection" />
              </div>
              <Button className="w-full">Connect</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Catalog
          </TabsTrigger>
          <TabsTrigger value="connectors" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Installed
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="capabilities" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search MCP packages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Featured Items */}
          {filteredItems.some(item => item.featured) && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Featured MCP Packages</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.filter(item => item.featured).map((item) => (
                  <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                        <Zap className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>by {item.author}</span>
                            <Badge variant="outline">{item.version}</Badge>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Activity className="w-4 h-4" />
                              {item.downloads ? item.downloads.toLocaleString() : '0'}
                            </span>
                            <span className="flex items-center gap-1">
                              ⭐ {item.rating || 0}/5
                            </span>
                          </div>
                          <Badge variant="outline">{item.category}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1"
                            onClick={() => installMutation.mutate(item.id)}
                            disabled={installMutation.isPending}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Install
                          </Button>
                          <Button variant="outline" size="sm">
                            <Code className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Items */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">All MCP Packages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.filter(item => !item.featured).map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>by {item.author}</span>
                          <Badge variant="outline">{item.version}</Badge>
                        </div>
                      </div>
                      <Badge 
                        variant={item.status === "verified" ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {item.status === "verified" && <Shield className="w-3 h-3 mr-1" />}
                        {item.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            {item.downloads ? item.downloads.toLocaleString() : '0'}
                          </span>
                          <span className="flex items-center gap-1">
                            ⭐ {item.rating || 0}/5
                          </span>
                        </div>
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated {item.lastUpdated}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => installMutation.mutate(item.id)}
                          disabled={installMutation.isPending}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Install
                        </Button>
                        <Button variant="outline" size="sm">
                          <Code className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="connectors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectors.map((connector) => (
              <Card key={connector.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{connector.name}</CardTitle>
                    <Badge variant={connector.status === "connected" ? "default" : "destructive"}>
                      {connector.status}
                    </Badge>
                  </div>
                  <CardDescription>v{connector.version}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{connector.description}</p>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Capabilities</Label>
                    <div className="flex flex-wrap gap-1">
                      {connector.capabilities.map((cap, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Last activity: {connector.lastActivity}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testConnectionMutation.mutate(connector.id)}
                      disabled={testConnectionMutation.isPending}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedConnector(connector.id)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {connectors.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No MCP Connectors</h3>
                <p className="text-gray-600 text-center max-w-md">
                  MCP connectors allow agents to interact with external tools and resources.
                  Configure connectors to enhance agent capabilities.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tools.map((tool, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <Code className="h-5 w-5 mr-2" />
                      {tool.name}
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => executeToolMutation.mutate({ toolName: tool.name, args: {} })}
                      disabled={executeToolMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Execute
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{tool.description}</p>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Input Schema</Label>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {tools.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Code className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tools Available</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Tools become available when MCP connectors are properly configured and connected.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((resource, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    {resource.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">{resource.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">URI:</span>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {resource.uri}
                      </code>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">MIME Type:</span>
                      <Badge variant="outline">{resource.mimeType}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {resources.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Resources Available</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Resources become available when MCP connectors are configured to expose data sources.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MCP Server Capabilities</CardTitle>
              <CardDescription>
                Available capabilities and features of the MCP server
              </CardDescription>
            </CardHeader>
            <CardContent>
              {capabilities ? (
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(capabilities, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-600">No capabilities information available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}