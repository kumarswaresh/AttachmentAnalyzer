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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, Key, Settings, Database, TrendingUp, Plus, Trash2, CheckCircle } from "lucide-react";
import type { Agent } from "@shared/schema";

interface APIKey {
  id: number;
  name: string;
  keyHash: string;
  permissions: string[];
  agentIds: string[];
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
  description?: string;
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
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [openAITestResult, setOpenAITestResult] = useState<{
    success: boolean;
    message: string;
    response?: string;
  } | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setNewApiKey(data.keyValue); // Store the generated key to display
      toast({ title: "Success", description: "API key generated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      permissions: selectedPermissions,
      agentAccess: Array.from(formData.getAll("agentAccess")) as string[],
    };

    generateApiKey.mutate(data);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, permission]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  const handleSelectAllPermissions = () => {
    const allPermissions = [
      "agents:read", "agents:write", "agents:delete",
      "chat:read", "chat:write", "analytics:read",
      "models:read", "models:write"
    ];
    
    if (selectedPermissions.length === allPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allPermissions);
    }
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

  // OpenAI integration test
  const testOpenAIConnection = async () => {
    setTestingOpenAI(true);
    setOpenAITestResult(null);
    
    try {
      const response = await fetch('/api/integrations/openai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: "Generate a brief test response to verify OpenAI API connection",
          model: "gpt-4",
          maxTokens: 50
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setOpenAITestResult({
          success: true,
          message: "OpenAI API connection successful",
          response: result.response
        });
      } else {
        setOpenAITestResult({
          success: false,
          message: result.error || "OpenAI API test failed"
        });
      }
    } catch (error) {
      setOpenAITestResult({
        success: false,
        message: "Failed to test OpenAI connection: " + (error as Error).message
      });
    } finally {
      setTestingOpenAI(false);
    }
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
                    <div className="flex items-center justify-between mb-2">
                      <Label>Permissions</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllPermissions}
                      >
                        {selectedPermissions.length === 8 ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                      {[
                        "agents:read",
                        "agents:write", 
                        "agents:delete",
                        "chat:read",
                        "chat:write",
                        "analytics:read",
                        "models:read",
                        "models:write"
                      ].map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox 
                            id={permission}
                            checked={selectedPermissions.includes(permission)}
                            onCheckedChange={(checked) => handlePermissionChange(permission, checked as boolean)}
                          />
                          <Label htmlFor={permission} className="text-sm">
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
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

          {/* Display newly generated API key */}
          {newApiKey && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  API Key Generated Successfully
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-green-700">
                    Please copy your API key now. For security reasons, it won't be shown again.
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-white border rounded-md">
                    <code className="flex-1 text-sm font-mono">{newApiKey}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(newApiKey);
                        toast({ title: "Copied!", description: "API key copied to clipboard" });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNewApiKey(null)}
                  >
                    I've saved my API key
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API Keys List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Your API Keys
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Existing API Keys */}
              <div className="grid gap-4">
                {apiKeys?.length > 0 ? apiKeys.map((apiKey: APIKey) => (
                  <Card key={apiKey.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{apiKey.name}</h3>
                        <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                          {apiKey.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {showApiKeys[apiKey.id] 
                            ? (apiKey.keyHash || "api_key_" + apiKey.id)
                            : `${"api_key_" + apiKey.id.toString().slice(0, 8)}...****`
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
                          onClick={() => copyToClipboard(apiKey.keyHash || "api_key_" + apiKey.id)}
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
                        Access: {apiKey.agentIds.includes("*") ? "All Agents" : `${apiKey.agentIds.length} agents`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No API keys created yet</p>
                    <p className="text-sm">Create your first API key to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
            {/* OpenAI Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  OpenAI Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Test and configure OpenAI API connection for AI-powered hotel recommendations.
                </p>
                
                <div>
                  <Label htmlFor="openaiModel">Model Selection</Label>
                  <Select defaultValue="gpt-4">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input 
                    id="maxTokens" 
                    type="number" 
                    defaultValue="2000"
                    min="100"
                    max="8000"
                  />
                </div>

                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input 
                    id="temperature" 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="2"
                    defaultValue="0.7"
                  />
                </div>

                <Button 
                  onClick={testOpenAIConnection}
                  disabled={testingOpenAI}
                  className="w-full"
                >
                  {testingOpenAI ? "Testing..." : "Test OpenAI Connection"}
                </Button>

                {openAITestResult && (
                  <div className={`p-3 rounded-md ${openAITestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm ${openAITestResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {openAITestResult.message}
                    </p>
                    {openAITestResult.response && (
                      <div className="mt-2">
                        <Label className="text-sm font-medium">Test Response:</Label>
                        <p className="text-xs mt-1 p-2 bg-white rounded border">
                          {openAITestResult.response}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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