import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, Key, Settings, Database, TrendingUp } from "lucide-react";

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  agentAccess: string[];
  createdAt: string;
  lastUsed?: string;
  active: boolean;
}

interface AgentAPIConfig {
  agentId: string;
  responseFormat: "json" | "text" | "structured";
  maxSuggestions: number;
  rateLimitPerMinute: number;
  requireAuth: boolean;
  customParameters: Record<string, any>;
}

export default function APIManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [selectedAgent, setSelectedAgent] = useState<string>("");

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
  });

  // Fetch API keys
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["/api/api-keys"],
  });

  // Generate API key mutation
  const generateApiKey = useMutation({
    mutationFn: async (data: { name: string; permissions: string[]; agentAccess: string[] }) => {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to generate API key");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "Success", description: "API key generated successfully" });
    },
  });

  // Configure agent API mutation
  const configureAgentAPI = useMutation({
    mutationFn: async (data: AgentAPIConfig) => {
      const response = await fetch(`/api/agents/${data.agentId}/api-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to configure agent API");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Agent API configuration updated" });
    },
  });

  const handleGenerateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const data = {
      name: formData.get("keyName") as string,
      permissions: (formData.get("permissions") as string).split(",").map(p => p.trim()),
      agentAccess: Array.from(formData.getAll("agentAccess")) as string[],
    };

    generateApiKey.mutate(data);
  };

  const handleConfigureAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const customParams: Record<string, any> = {};
    try {
      const paramsJson = formData.get("customParameters") as string;
      if (paramsJson) {
        Object.assign(customParams, JSON.parse(paramsJson));
      }
    } catch (error) {
      toast({ title: "Error", description: "Invalid JSON in custom parameters", variant: "destructive" });
      return;
    }

    const config: AgentAPIConfig = {
      agentId: selectedAgent,
      responseFormat: formData.get("responseFormat") as "json" | "text" | "structured",
      maxSuggestions: parseInt(formData.get("maxSuggestions") as string),
      rateLimitPerMinute: parseInt(formData.get("rateLimitPerMinute") as string),
      requireAuth: formData.get("requireAuth") === "on",
      customParameters: {
        ...customParams,
        googleTrendsIntegration: formData.get("googleTrendsIntegration") === "on",
        databaseIntegration: formData.get("databaseIntegration") === "on",
        supplierAPIs: formData.get("supplierAPIs") === "on",
      }
    };

    configureAgentAPI.mutate(config);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "API key copied to clipboard" });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowApiKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Management</h1>
          <p className="text-muted-foreground">
            Manage API keys and configure agent endpoints for external access
          </p>
        </div>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="agent-config">Agent Configuration</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Generate New API Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateApiKey} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input 
                      id="keyName" 
                      name="keyName" 
                      placeholder="Production API Key" 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="permissions">Permissions</Label>
                    <Input 
                      id="permissions" 
                      name="permissions" 
                      placeholder="read, write, execute" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="agentAccess">Agent Access</Label>
                  <Select name="agentAccess" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select accessible agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="*">All Agents</SelectItem>
                      {agents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={generateApiKey.isPending}>
                  {generateApiKey.isPending ? "Generating..." : "Generate API Key"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing API Keys */}
          <div className="grid gap-4">
            {apiKeys.map((apiKey: APIKey) => (
              <Card key={apiKey.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{apiKey.name}</h3>
                        <Badge variant={apiKey.active ? "default" : "secondary"}>
                          {apiKey.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {showApiKeys[apiKey.id] 
                            ? apiKey.key 
                            : `${apiKey.key.slice(0, 12)}...${apiKey.key.slice(-4)}`
                          }
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {showApiKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {apiKey.permissions.map(permission => (
                          <Badge key={permission} variant="outline">{permission}</Badge>
                        ))}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                        {apiKey.lastUsed && ` • Last used: ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Access: {apiKey.agentAccess.includes("*") ? "All Agents" : `${apiKey.agentAccess.length} agents`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Agent Configuration Tab */}
        <TabsContent value="agent-config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configure Agent API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfigureAgent} className="space-y-4">
                <div>
                  <Label htmlFor="agentSelect">Select Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agent to configure" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="responseFormat">Response Format</Label>
                    <Select name="responseFormat" defaultValue="json">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="structured">Structured</SelectItem>
                        <SelectItem value="text">Plain Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maxSuggestions">Max Suggestions</Label>
                    <Input 
                      id="maxSuggestions" 
                      name="maxSuggestions" 
                      type="number" 
                      defaultValue="10" 
                      min="1" 
                      max="50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rateLimitPerMinute">Rate Limit (per minute)</Label>
                    <Input 
                      id="rateLimitPerMinute" 
                      name="rateLimitPerMinute" 
                      type="number" 
                      defaultValue="100" 
                      min="1"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="requireAuth" name="requireAuth" defaultChecked />
                    <Label htmlFor="requireAuth">Require Authentication</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Integration Settings</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="googleTrendsIntegration" name="googleTrendsIntegration" defaultChecked />
                      <Label htmlFor="googleTrendsIntegration" className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Google Trends
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="databaseIntegration" name="databaseIntegration" defaultChecked />
                      <Label htmlFor="databaseIntegration" className="flex items-center gap-1">
                        <Database className="w-4 h-4" />
                        Database Access
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="supplierAPIs" name="supplierAPIs" defaultChecked />
                      <Label htmlFor="supplierAPIs">Supplier APIs</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="customParameters">Custom Parameters (JSON)</Label>
                  <Textarea 
                    id="customParameters" 
                    name="customParameters" 
                    placeholder='{"includePackages": true, "includePricing": true}'
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={!selectedAgent || configureAgentAPI.isPending}>
                  {configureAgentAPI.isPending ? "Configuring..." : "Configure Agent API"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Google Trends Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect to Google Trends API to get real-time trending data for hotel recommendations.
                </p>
                
                <div>
                  <Label htmlFor="googleApiKey">Google Trends API Key</Label>
                  <Input 
                    id="googleApiKey" 
                    type="password" 
                    placeholder="Enter your Google API key"
                  />
                </div>

                <div>
                  <Label htmlFor="googleRegion">Default Region</Label>
                  <Select defaultValue="US">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full">Configure Google Trends</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Connections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure external database connections for historical data access.
                </p>

                <div>
                  <Label htmlFor="dbConnectionString">Database Connection String</Label>
                  <Input 
                    id="dbConnectionString" 
                    type="password" 
                    placeholder="postgresql://user:pass@host:port/db"
                  />
                </div>

                <div>
                  <Label htmlFor="dbToken">Access Token</Label>
                  <Input 
                    id="dbToken" 
                    type="password" 
                    placeholder="Database access token"
                  />
                </div>

                <Button className="w-full">Test Connection</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <h3>Authentication</h3>
                <p>Include your API key in the request header:</p>
                <pre className="bg-gray-100 p-3 rounded">
{`X-API-Key: your_api_key_here`}
                </pre>

                <h3>Execute Agent</h3>
                <p>POST to agent-specific endpoints:</p>
                <pre className="bg-gray-100 p-3 rounded">
{`POST /api/agents/{agent_id}/execute
Content-Type: application/json

{
  "input": "Suggest hotels in Paris for Christmas",
  "parameters": {
    "maxSuggestions": 10,
    "responseFormat": "json",
    "includePackages": true
  }
}`}
                </pre>

                <h3>Response Format</h3>
                <pre className="bg-gray-100 p-3 rounded">
{`{
  "success": true,
  "agentId": "hotel-marketing-agent",
  "result": {
    "recommendations": [...],
    "metadata": {...}
  },
  "metadata": {
    "executionTime": 1250,
    "model": "gpt-4o",
    "timestamp": "2024-12-01T12:00:00Z"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}