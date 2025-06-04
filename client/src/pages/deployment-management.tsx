import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Rocket, 
  ExternalLink, 
  Key, 
  Settings, 
  Copy,
  Eye,
  EyeOff,
  Globe,
  Shield,
  Clock,
  Activity
} from "lucide-react";

interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  deploymentType: 'standalone' | 'embedded' | 'api_only';
  allowedOrigins?: string[];
}

export default function DeploymentManagement() {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedAgentApp, setSelectedAgentApp] = useState<string>("");
  const [deployConfig, setDeployConfig] = useState<DeploymentConfig>({
    environment: 'production',
    deploymentType: 'standalone'
  });
  const [showAccessKey, setShowAccessKey] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Fetch agents and agent apps
  const { data: agents = [], isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['/api/agents'],
    retry: false
  });

  const { data: agentApps = [], isLoading: agentAppsLoading, error: agentAppsError } = useQuery({
    queryKey: ['/api/agent-apps'],
    retry: false
  });

  const { data: deploymentsResponse } = useQuery({
    queryKey: ['/api/deployments']
  });
  
  const deployments = deploymentsResponse?.deployments || [];

  // Deploy agent mutation
  const deployAgentMutation = useMutation({
    mutationFn: async (data: { agentId: string; config: DeploymentConfig }) => {
      const response = await apiRequest("POST", `/api/deployments/agents/${data.agentId}`, data.config);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Agent Deployed",
        description: `${result.deployment.name} deployed successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deployments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Deploy agent app mutation
  const deployAgentAppMutation = useMutation({
    mutationFn: async (data: { agentAppId: string; config: DeploymentConfig }) => {
      const response = await apiRequest("POST", `/api/deployments/agent-apps/${data.agentAppId}`, data.config);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Agent App Deployed",
        description: `${result.deployment.name} deployed successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deployments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDeployAgent = () => {
    if (!selectedAgent) {
      toast({
        title: "No Agent Selected",
        description: "Please select an agent to deploy",
        variant: "destructive",
      });
      return;
    }

    deployAgentMutation.mutate({
      agentId: selectedAgent,
      config: deployConfig
    });
  };

  const handleDeployAgentApp = () => {
    if (!selectedAgentApp) {
      toast({
        title: "No Agent App Selected",
        description: "Please select an agent app to deploy",
        variant: "destructive",
      });
      return;
    }

    deployAgentAppMutation.mutate({
      agentAppId: selectedAgentApp,
      config: deployConfig
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const toggleAccessKeyVisibility = (deploymentId: string) => {
    setShowAccessKey(prev => ({
      ...prev,
      [deploymentId]: !prev[deploymentId]
    }));
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800"
    };
    return <Badge className={colors[status as keyof typeof colors] || colors.inactive}>{status}</Badge>;
  };

  const getEnvironmentIcon = (env: string) => {
    switch (env) {
      case 'production': return <Globe className="h-4 w-4 text-green-600" />;
      case 'staging': return <Settings className="h-4 w-4 text-yellow-600" />;
      case 'development': return <Activity className="h-4 w-4 text-blue-600" />;
      default: return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployment Management</h1>
          <p className="text-muted-foreground mt-2">
            Deploy agents and agent apps as independent services with centralized credential access
          </p>
        </div>
      </div>

      <Tabs defaultValue="deploy" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deploy">Deploy Services</TabsTrigger>
          <TabsTrigger value="active">Active Deployments</TabsTrigger>
          <TabsTrigger value="docs">Integration Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="deploy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deploy Agent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Deploy Agent
                </CardTitle>
                <CardDescription>
                  Deploy a single agent as an independent service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agent to deploy" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(agents) && agents.map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Environment</Label>
                  <Select 
                    value={deployConfig.environment} 
                    onValueChange={(value: any) => setDeployConfig({...deployConfig, environment: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Deployment Type</Label>
                  <Select 
                    value={deployConfig.deploymentType} 
                    onValueChange={(value: any) => setDeployConfig({...deployConfig, deploymentType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone">Standalone Service</SelectItem>
                      <SelectItem value="embedded">Embedded Integration</SelectItem>
                      <SelectItem value="api_only">API Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleDeployAgent} 
                  disabled={deployAgentMutation.isPending || !selectedAgent}
                  className="w-full"
                >
                  {deployAgentMutation.isPending ? "Deploying..." : "Deploy Agent"}
                </Button>
              </CardContent>
            </Card>

            {/* Deploy Agent App */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Deploy Agent App
                </CardTitle>
                <CardDescription>
                  Deploy a multi-agent workflow as an independent service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Agent App</Label>
                  <Select value={selectedAgentApp} onValueChange={setSelectedAgentApp}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agent app to deploy" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(agentApps) && agentApps.map((app: any) => (
                        <SelectItem key={app.id} value={app.id}>
                          {app.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Environment</Label>
                  <Select 
                    value={deployConfig.environment} 
                    onValueChange={(value: any) => setDeployConfig({...deployConfig, environment: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Deployment Type</Label>
                  <Select 
                    value={deployConfig.deploymentType} 
                    onValueChange={(value: any) => setDeployConfig({...deployConfig, deploymentType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone">Standalone Service</SelectItem>
                      <SelectItem value="embedded">Embedded Integration</SelectItem>
                      <SelectItem value="api_only">API Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleDeployAgentApp} 
                  disabled={deployAgentAppMutation.isPending || !selectedAgentApp}
                  className="w-full"
                >
                  {deployAgentAppMutation.isPending ? "Deploying..." : "Deploy Agent App"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          {deployments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Rocket className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Deployments</h3>
                <p className="text-muted-foreground text-center">
                  Deploy your first agent or agent app to see it listed here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {deployments.map((deployment: any) => (
                <Card key={deployment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getEnvironmentIcon(deployment.environment)}
                          {deployment.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{deployment.type}</Badge>
                          {getStatusBadge(deployment.status)}
                          <span className="text-sm text-muted-foreground">
                            v{deployment.version}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(deployment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Access Key */}
                      <div>
                        <Label className="text-sm font-medium">Access Key</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type={showAccessKey[deployment.id] ? "text" : "password"}
                            value={deployment.accessKey}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAccessKeyVisibility(deployment.id)}
                          >
                            {showAccessKey[deployment.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(deployment.accessKey, "Access key")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* API Endpoints */}
                      <div>
                        <Label className="text-sm font-medium">API Endpoints</Label>
                        <div className="space-y-2 mt-2">
                          {Object.entries(deployment.endpoints).map(([key, endpoint]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm font-mono">{key}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground font-mono">{endpoint}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(endpoint, key)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Credential Requirements */}
                      <div>
                        <Label className="text-sm font-medium">Required Credentials</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {deployment.credentialRequirements.map((req: any, index: number) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              <Key className="h-3 w-3" />
                              {req.provider} ({req.keyType})
                              {req.required && <span className="text-red-500">*</span>}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
              <CardDescription>
                How to integrate deployed agents with external applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Include your access key in the request headers to authenticate with deployed services.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <code className="text-sm">
                    curl -X POST https://your-domain.com/api/deployed/agents/AGENT_ID/execute \<br />
                    &nbsp;&nbsp;-H "x-access-key: YOUR_ACCESS_KEY" \<br />
                    &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                    &nbsp;&nbsp;-d '{"{"}"input": "Your prompt here"{"}"}'
                  </code>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Credential Management</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Deployed agents automatically access credentials from the platform's credential management system.
                  No need to manage API keys separately - they're securely handled by the platform.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Key Benefits:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Centralized credential management</li>
                    <li>• Automatic credential rotation</li>
                    <li>• Secure credential storage and access</li>
                    <li>• No credential exposure in deployment code</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Response Format</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All deployed services return consistent JSON responses with execution results and metadata.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <code className="text-sm">
                    {"{"}<br />
                    &nbsp;&nbsp;"success": true,<br />
                    &nbsp;&nbsp;"result": {"{"}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"agentId": "agent-123",<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"output": "Generated response",<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"credentialUsed": "OpenAI Production Key",<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;"timestamp": "2024-01-15T10:30:00Z"<br />
                    &nbsp;&nbsp;{"}"}<br />
                    {"}"}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}