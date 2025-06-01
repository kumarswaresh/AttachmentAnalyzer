import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Network, 
  Database, 
  Zap, 
  MessageSquare, 
  Settings, 
  TrendingUp, 
  BarChart3, 
  Globe,
  Terminal,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema?: any;
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}

interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

interface ExternalService {
  name: string;
  status: 'connected' | 'disconnected' | 'testing';
  lastTested?: string;
}

export default function MCPProtocol() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mcpSocket, setMcpSocket] = useState<WebSocket | null>(null);
  const [mcpConnectionStatus, setMcpConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [mcpMessages, setMcpMessages] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolInput, setToolInput] = useState<string>('{}');
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [promptArgs, setPromptArgs] = useState<string>('{}');
  const [hotelSocket, setHotelSocket] = useState<WebSocket | null>(null);
  const [hotelConnectionStatus, setHotelConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [hotelData, setHotelData] = useState<any>(null);
  const [selectedHotelMethod, setSelectedHotelMethod] = useState<string>('');

  // Fetch MCP capabilities
  const { data: capabilities } = useQuery({
    queryKey: ['/api/mcp/capabilities'],
  });

  // Fetch MCP tools
  const { data: tools } = useQuery({
    queryKey: ['/api/mcp/tools'],
  });

  // Fetch MCP resources
  const { data: resources } = useQuery({
    queryKey: ['/api/mcp/resources'],
  });

  // Fetch MCP prompts
  const { data: prompts } = useQuery({
    queryKey: ['/api/mcp/prompts'],
  });

  // Fetch external services
  const { data: externalServices } = useQuery({
    queryKey: ['/api/external/services'],
  });

  // Test external service connection
  const testServiceMutation = useMutation({
    mutationFn: async (serviceName: string) => {
      return apiRequest('POST', `/api/external/${serviceName}/test`);
    },
    onSuccess: (data, serviceName) => {
      toast({
        title: 'Service Test Result',
        description: data.success ? `${serviceName} connection successful` : `${serviceName} connection failed`,
        variant: data.success ? 'default' : 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/external/services'] });
    },
    onError: (error) => {
      toast({
        title: 'Test Failed',
        description: 'Failed to test service connection',
        variant: 'destructive',
      });
    },
  });

  // Make external API request
  const externalRequestMutation = useMutation({
    mutationFn: async ({ service, endpoint, method, data }: any) => {
      return apiRequest('POST', `/api/external/${service}/request`, {
        endpoint,
        method,
        data: data ? JSON.parse(data) : undefined,
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Request Successful',
        description: 'External API request completed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Request Failed',
        description: 'Failed to make external API request',
        variant: 'destructive',
      });
    },
  });

  // Connect to MCP WebSocket
  const connectMCP = () => {
    if (mcpSocket?.readyState === WebSocket.OPEN) return;

    setMcpConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/mcp`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setMcpConnectionStatus('connected');
      setMcpSocket(socket);
      toast({
        title: 'MCP Connected',
        description: 'Connected to MCP protocol server',
      });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setMcpMessages(prev => [...prev, { ...message, timestamp: new Date() }]);
      } catch (error) {
        console.error('Failed to parse MCP message:', error);
      }
    };

    socket.onclose = () => {
      setMcpConnectionStatus('disconnected');
      setMcpSocket(null);
      toast({
        title: 'MCP Disconnected',
        description: 'Disconnected from MCP protocol server',
        variant: 'destructive',
      });
    };

    socket.onerror = (error) => {
      console.error('MCP WebSocket error:', error);
      setMcpConnectionStatus('disconnected');
      toast({
        title: 'MCP Error',
        description: 'Failed to connect to MCP protocol server',
        variant: 'destructive',
      });
    };
  };

  // Disconnect from MCP WebSocket
  const disconnectMCP = () => {
    if (mcpSocket) {
      mcpSocket.close();
      setMcpSocket(null);
      setMcpConnectionStatus('disconnected');
    }
  };

  // Send MCP message
  const sendMCPMessage = (message: any) => {
    if (mcpSocket?.readyState === WebSocket.OPEN) {
      mcpSocket.send(JSON.stringify(message));
    } else {
      toast({
        title: 'Not Connected',
        description: 'Please connect to MCP protocol server first',
        variant: 'destructive',
      });
    }
  };

  // Execute MCP tool
  const executeTool = () => {
    if (!selectedTool) return;

    try {
      const args = JSON.parse(toolInput);
      const message = {
        id: `tool-${Date.now()}`,
        type: 'request',
        method: 'tools/call',
        params: {
          name: selectedTool,
          arguments: args,
        },
      };
      sendMCPMessage(message);
    } catch (error) {
      toast({
        title: 'Invalid Input',
        description: 'Please provide valid JSON input',
        variant: 'destructive',
      });
    }
  };

  // Read MCP resource
  const readResource = () => {
    if (!selectedResource) return;

    const message = {
      id: `resource-${Date.now()}`,
      type: 'request',
      method: 'resources/read',
      params: {
        uri: selectedResource,
      },
    };
    sendMCPMessage(message);
  };

  // Get MCP prompt
  const getPrompt = () => {
    if (!selectedPrompt) return;

    try {
      const args = JSON.parse(promptArgs);
      const message = {
        id: `prompt-${Date.now()}`,
        type: 'request',
        method: 'prompts/get',
        params: {
          name: selectedPrompt,
          arguments: args,
        },
      };
      sendMCPMessage(message);
    } catch (error) {
      toast({
        title: 'Invalid Arguments',
        description: 'Please provide valid JSON arguments',
        variant: 'destructive',
      });
    }
  };

  // Hotel MCP Connection functions
  const connectToHotelMCP = () => {
    if (hotelSocket) {
      hotelSocket.close();
    }

    setHotelConnectionStatus('connecting');
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/hotel`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setHotelConnectionStatus('connected');
      setHotelSocket(ws);
      toast({
        title: 'Hotel MCP Connected',
        description: 'Successfully connected to Hotel MCP Server',
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setHotelData(message);
        setMcpMessages(prev => [...prev, { 
          timestamp: new Date().toISOString(), 
          type: 'hotel_data', 
          data: message 
        }]);
      } catch (error) {
        console.error('Hotel MCP message error:', error);
      }
    };

    ws.onclose = () => {
      setHotelConnectionStatus('disconnected');
      setHotelSocket(null);
    };

    ws.onerror = () => {
      setHotelConnectionStatus('disconnected');
      setHotelSocket(null);
      toast({
        title: 'Hotel MCP Connection Failed',
        description: 'Failed to connect to Hotel MCP Server',
        variant: 'destructive',
      });
    };
  };

  const testHotelMethod = async (method: string) => {
    if (!hotelSocket || hotelConnectionStatus !== 'connected') {
      toast({
        title: 'Not Connected',
        description: 'Please connect to Hotel MCP first',
        variant: 'destructive',
      });
      return;
    }

    // For REST API calls to hotel endpoints
    try {
      const endpoint = method.replace('hotel/', '');
      const response = await apiRequest('GET', `/api/hotel/${endpoint.replace('/', '/')}`);
      setHotelData(response);
      toast({
        title: 'Hotel Method Executed',
        description: `Successfully executed ${method}`,
      });
    } catch (error) {
      toast({
        title: 'Hotel Method Failed',
        description: `Failed to execute ${method}`,
        variant: 'destructive',
      });
    }
  };

  const hotelMethods = [
    { name: 'bookings/list', description: 'List all hotel bookings' },
    { name: 'analytics/most-booked', description: 'Get most booked hotels' },
    { name: 'analytics/seasonal', description: 'Get seasonal trends' },
    { name: 'analytics/events', description: 'Get event-based bookings' },
    { name: 'festivals/list', description: 'Get festival data' },
    { name: 'revenue/analysis', description: 'Get revenue analysis' },
    { name: 'bookings/by-period', description: 'Get bookings by time period' }
  ];

  useEffect(() => {
    return () => {
      if (mcpSocket) {
        mcpSocket.close();
      }
      if (hotelSocket) {
        hotelSocket.close();
      }
    };
  }, [mcpSocket, hotelSocket]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MCP Protocol & External Integrations</h1>
          <p className="text-muted-foreground">
            Advanced Model Context Protocol features and external service integrations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <a href="/catalog">
              <Eye className="h-4 w-4 mr-2" />
              MCP Catalog
            </a>
          </Button>
          <Badge variant={mcpConnectionStatus === 'connected' ? 'default' : 'secondary'}>
            {mcpConnectionStatus === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
            {mcpConnectionStatus === 'connecting' && <Clock className="w-3 h-3 mr-1" />}
            {mcpConnectionStatus === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
            {mcpConnectionStatus.toUpperCase()}
          </Badge>
          {mcpConnectionStatus === 'disconnected' ? (
            <Button onClick={connectMCP} size="sm">
              <Network className="w-4 h-4 mr-2" />
              Connect MCP
            </Button>
          ) : (
            <Button onClick={disconnectMCP} size="sm" variant="outline">
              Disconnect
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MCP Capabilities Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              MCP Capabilities
            </CardTitle>
            <CardDescription>
              Server capabilities and protocol information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {capabilities ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Resources</Label>
                  <div className="flex space-x-2 mt-1">
                    {capabilities.resources?.subscribe && (
                      <Badge variant="outline" className="text-xs">Subscribe</Badge>
                    )}
                    {capabilities.resources?.listChanged && (
                      <Badge variant="outline" className="text-xs">List Changed</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tools</Label>
                  <div className="flex space-x-2 mt-1">
                    {capabilities.tools?.listChanged && (
                      <Badge variant="outline" className="text-xs">List Changed</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Prompts</Label>
                  <div className="flex space-x-2 mt-1">
                    {capabilities.prompts?.listChanged && (
                      <Badge variant="outline" className="text-xs">List Changed</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Logging Level</Label>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {capabilities.logging?.level || 'info'}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading capabilities...</p>
            )}
          </CardContent>
        </Card>

        {/* External Services Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              External Services
            </CardTitle>
            <CardDescription>
              Connected external service integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {externalServices?.map((service: string) => (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium">{service}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => testServiceMutation.mutate(service)}
                    disabled={testServiceMutation.isPending}
                  >
                    Test
                  </Button>
                </div>
              ))}
              {(!externalServices || externalServices.length === 0) && (
                <p className="text-sm text-muted-foreground">No external services configured</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common MCP protocol operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => sendMCPMessage({ id: 'list-tools', type: 'request', method: 'tools/list' })}
              >
                <Terminal className="w-4 h-4 mr-2" />
                List Tools
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => sendMCPMessage({ id: 'list-resources', type: 'request', method: 'resources/list' })}
              >
                <Database className="w-4 h-4 mr-2" />
                List Resources
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => sendMCPMessage({ id: 'list-prompts', type: 'request', method: 'prompts/list' })}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                List Prompts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tools">MCP Tools</TabsTrigger>
          <TabsTrigger value="resources">MCP Resources</TabsTrigger>
          <TabsTrigger value="prompts">MCP Prompts</TabsTrigger>
          <TabsTrigger value="external">External APIs</TabsTrigger>
          <TabsTrigger value="console">Protocol Console</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
                <CardDescription>
                  MCP tools for data analysis and external integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tool-select">Select Tool</Label>
                    <Select value={selectedTool} onValueChange={setSelectedTool}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a tool to execute" />
                      </SelectTrigger>
                      <SelectContent>
                        {tools?.map((tool: MCPTool) => (
                          <SelectItem key={tool.name} value={tool.name}>
                            {tool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedTool && (
                    <div>
                      <Label htmlFor="tool-input">Tool Arguments (JSON)</Label>
                      <Textarea
                        id="tool-input"
                        value={toolInput}
                        onChange={(e) => setToolInput(e.target.value)}
                        placeholder="Enter tool arguments as JSON"
                        className="font-mono text-sm"
                        rows={6}
                      />
                    </div>
                  )}

                  <Button onClick={executeTool} disabled={!selectedTool || mcpConnectionStatus !== 'connected'}>
                    <Play className="w-4 h-4 mr-2" />
                    Execute Tool
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tool Details</CardTitle>
                <CardDescription>
                  Schema and documentation for selected tool
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTool && tools ? (
                  <div className="space-y-4">
                    {(() => {
                      const tool = tools.find((t: MCPTool) => t.name === selectedTool);
                      return tool ? (
                        <>
                          <div>
                            <Label className="text-sm font-medium">Description</Label>
                            <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">Input Schema</Label>
                            <pre className="text-xs bg-muted p-3 rounded-md mt-1 overflow-auto">
                              {JSON.stringify(tool.inputSchema, null, 2)}
                            </pre>
                          </div>

                          {tool.outputSchema && (
                            <div>
                              <Label className="text-sm font-medium">Output Schema</Label>
                              <pre className="text-xs bg-muted p-3 rounded-md mt-1 overflow-auto">
                                {JSON.stringify(tool.outputSchema, null, 2)}
                              </pre>
                            </div>
                          )}
                        </>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a tool to view details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Resources</CardTitle>
                <CardDescription>
                  MCP resources for data access and templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resource-select">Select Resource</Label>
                    <Select value={selectedResource} onValueChange={setSelectedResource}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a resource to read" />
                      </SelectTrigger>
                      <SelectContent>
                        {resources?.map((resource: MCPResource) => (
                          <SelectItem key={resource.uri} value={resource.uri}>
                            {resource.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={readResource} disabled={!selectedResource || mcpConnectionStatus !== 'connected'}>
                    <Database className="w-4 h-4 mr-2" />
                    Read Resource
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Details</CardTitle>
                <CardDescription>
                  Information about the selected resource
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedResource && resources ? (
                  <div className="space-y-4">
                    {(() => {
                      const resource = resources.find((r: MCPResource) => r.uri === selectedResource);
                      return resource ? (
                        <>
                          <div>
                            <Label className="text-sm font-medium">URI</Label>
                            <p className="text-sm text-muted-foreground mt-1 font-mono">{resource.uri}</p>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">Description</Label>
                            <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                          </div>

                          <div>
                            <Label className="text-sm font-medium">MIME Type</Label>
                            <Badge variant="outline" className="text-xs mt-1">{resource.mimeType}</Badge>
                          </div>

                          {resource.metadata && (
                            <div>
                              <Label className="text-sm font-medium">Metadata</Label>
                              <pre className="text-xs bg-muted p-3 rounded-md mt-1 overflow-auto">
                                {JSON.stringify(resource.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a resource to view details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Prompts</CardTitle>
                <CardDescription>
                  MCP prompts for AI model interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt-select">Select Prompt</Label>
                    <Select value={selectedPrompt} onValueChange={setSelectedPrompt}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a prompt to generate" />
                      </SelectTrigger>
                      <SelectContent>
                        {prompts?.map((prompt: MCPPrompt) => (
                          <SelectItem key={prompt.name} value={prompt.name}>
                            {prompt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPrompt && (
                    <div>
                      <Label htmlFor="prompt-args">Prompt Arguments (JSON)</Label>
                      <Textarea
                        id="prompt-args"
                        value={promptArgs}
                        onChange={(e) => setPromptArgs(e.target.value)}
                        placeholder="Enter prompt arguments as JSON"
                        className="font-mono text-sm"
                        rows={4}
                      />
                    </div>
                  )}

                  <Button onClick={getPrompt} disabled={!selectedPrompt || mcpConnectionStatus !== 'connected'}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Generate Prompt
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prompt Details</CardTitle>
                <CardDescription>
                  Arguments and documentation for selected prompt
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedPrompt && prompts ? (
                  <div className="space-y-4">
                    {(() => {
                      const prompt = prompts.find((p: MCPPrompt) => p.name === selectedPrompt);
                      return prompt ? (
                        <>
                          <div>
                            <Label className="text-sm font-medium">Description</Label>
                            <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
                          </div>
                          
                          {prompt.arguments && prompt.arguments.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium">Arguments</Label>
                              <div className="space-y-2 mt-2">
                                {prompt.arguments.map((arg, index) => (
                                  <div key={index} className="border p-3 rounded-md">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono text-sm">{arg.name}</span>
                                      {arg.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{arg.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a prompt to view details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="external" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>External API Integration</CardTitle>
              <CardDescription>
                Test and interact with external service APIs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      External integrations require proper API keys and credentials to function.
                      Please configure your external service credentials to enable these features.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Button className="w-full" variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Get Market Trends
                    </Button>
                    <Button className="w-full" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Analyze Competition
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Globe className="w-4 h-4 mr-2" />
                      Social Media Analytics
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Service Status</Label>
                    <div className="space-y-2 mt-2">
                      {externalServices?.map((service: string) => (
                        <div key={service} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{service}</span>
                          <Badge variant="outline">Ready</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="console" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MCP Protocol Console</CardTitle>
              <CardDescription>
                Real-time MCP protocol messages and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full border rounded-md p-4">
                {mcpMessages.length > 0 ? (
                  <div className="space-y-2">
                    {mcpMessages.map((message, index) => (
                      <div key={index} className="text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant={message.type === 'response' ? 'default' : message.type === 'error' ? 'destructive' : 'secondary'}>
                            {message.type}
                          </Badge>
                          <span className="text-muted-foreground">
                            {message.timestamp?.toLocaleTimeString()}
                          </span>
                        </div>
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(message, null, 2)}
                        </pre>
                        <Separator />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No MCP protocol messages yet. Connect and start interacting!</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hotel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Hotel MCP Server
              </CardTitle>
              <CardDescription>
                Real-time hotel booking data and analytics with authentic seasonal trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Connection Status</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect to the Hotel MCP Server for live booking data
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={hotelConnectionStatus === 'connected' ? 'default' : 'secondary'}>
                      {hotelConnectionStatus === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {hotelConnectionStatus === 'connecting' && <Clock className="w-3 h-3 mr-1" />}
                      {hotelConnectionStatus === 'disconnected' && <XCircle className="w-3 h-3 mr-1" />}
                      {hotelConnectionStatus.toUpperCase()}
                    </Badge>
                    {hotelConnectionStatus === 'disconnected' ? (
                      <Button onClick={connectToHotelMCP} size="sm">
                        <Network className="w-4 h-4 mr-2" />
                        Connect Hotel MCP
                      </Button>
                    ) : (
                      <Button onClick={() => {
                        if (hotelSocket) {
                          hotelSocket.close();
                          setHotelSocket(null);
                          setHotelConnectionStatus('disconnected');
                        }
                      }} size="sm" variant="outline">
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Available Methods</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {hotelMethods.map((method) => (
                          <div key={method.name} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="text-sm font-medium">{method.name}</div>
                              <div className="text-xs text-muted-foreground">{method.description}</div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => testHotelMethod(method.name)}
                              disabled={hotelConnectionStatus !== 'connected'}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Test
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Live Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {hotelData ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Latest Response</Label>
                            <div className="mt-1 p-2 bg-muted rounded text-xs">
                              <pre>{JSON.stringify(hotelData, null, 2)}</pre>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Connect to Hotel MCP to see live booking data</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hotel Booking Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <h4 className="font-medium">Seasonal Analytics</h4>
                        <p className="text-sm text-muted-foreground">Track booking patterns across seasons</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <h4 className="font-medium">Event Tracking</h4>
                        <p className="text-sm text-muted-foreground">Monitor festival and conference bookings</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <Globe className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <h4 className="font-medium">Real-time Data</h4>
                        <p className="text-sm text-muted-foreground">Live booking updates via WebSocket</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}