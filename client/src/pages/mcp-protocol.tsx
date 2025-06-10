import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Play, Code, Database, MessageSquare, Activity } from "lucide-react";

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
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">MCP Protocol Management</h1>
        <p className="text-gray-600 mt-2">
          Model Context Protocol integration for enhanced agent capabilities
        </p>
      </div>

      <Tabs defaultValue="connectors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>

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