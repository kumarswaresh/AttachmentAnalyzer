import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Save, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Settings, 
  Zap,
  GitBranch,
  Square,
  Circle,
  Triangle,
  Database,
  MessageSquare,
  Filter,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AppNode {
  id: string;
  type: 'agent' | 'condition' | 'input' | 'output' | 'transform';
  position: { x: number; y: number };
  data: {
    label: string;
    agentId?: string;
    condition?: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
    transform?: string;
  };
}

interface AppEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    condition?: string;
    mapping?: Record<string, string>;
  };
}

interface AgentApp {
  id: number;
  name: string;
  description: string;
  flowDefinition: {
    nodes: AppNode[];
    edges: AppEdge[];
  };
  config: Record<string, any>;
  isPublic: boolean;
  createdAt: Date;
}

export default function VisualAppBuilderPage() {
  const [selectedApp, setSelectedApp] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [selectedNodeType, setSelectedNodeType] = useState<string>("");
  const [executionInput, setExecutionInput] = useState<string>("");
  const [executionResults, setExecutionResults] = useState<any>(null);
  
  const [newApp, setNewApp] = useState({
    name: "",
    description: "",
    isPublic: false
  });

  const [currentFlow, setCurrentFlow] = useState<{
    nodes: AppNode[];
    edges: AppEdge[];
  }>({
    nodes: [],
    edges: []
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch apps
  const { data: apps = [], isLoading: appsLoading } = useQuery({
    queryKey: ["/api/apps"],
    queryFn: () => apiRequest("GET", "/api/apps")
  });

  // Fetch agents for node configuration
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"]
  });

  // Create app mutation
  const createAppMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/apps", data);
    },
    onSuccess: () => {
      toast({
        title: "App Created",
        description: "Agent app has been successfully created"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/apps"] });
      setIsCreateDialogOpen(false);
      setNewApp({ name: "", description: "", isPublic: false });
      setCurrentFlow({ nodes: [], edges: [] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create agent app",
        variant: "destructive"
      });
    }
  });

  // Execute app mutation
  const executeAppMutation = useMutation({
    mutationFn: async (data: { appId: number; inputData: any; executionContext?: any }) => {
      return apiRequest("POST", `/api/apps/${data.appId}/execute`, {
        inputData: data.inputData,
        executionContext: data.executionContext
      });
    },
    onSuccess: (data) => {
      setExecutionResults(data);
      toast({
        title: "Execution Complete",
        description: `App execution ${data.status === 'completed' ? 'succeeded' : 'failed'}`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to execute agent app",
        variant: "destructive"
      });
    }
  });

  const nodeTypes = [
    { type: 'input', label: 'Input', icon: Square, color: 'bg-blue-100 border-blue-300' },
    { type: 'agent', label: 'Agent', icon: MessageSquare, color: 'bg-green-100 border-green-300' },
    { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-yellow-100 border-yellow-300' },
    { type: 'transform', label: 'Transform', icon: Filter, color: 'bg-purple-100 border-purple-300' },
    { type: 'output', label: 'Output', icon: Circle, color: 'bg-gray-100 border-gray-300' }
  ];

  const addNode = useCallback((type: string) => {
    const newNode: AppNode = {
      id: `node-${Date.now()}`,
      type: type as any,
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      },
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`
      }
    };

    setCurrentFlow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setCurrentFlow(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
  }, []);

  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    const newEdge: AppEdge = {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId
    };

    setCurrentFlow(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge]
    }));
  }, []);

  const handleCreateApp = () => {
    if (currentFlow.nodes.length === 0) {
      toast({
        title: "Empty Flow",
        description: "Please add at least one node to your app",
        variant: "destructive"
      });
      return;
    }

    createAppMutation.mutate({
      name: newApp.name,
      description: newApp.description,
      nodes: currentFlow.nodes,
      edges: currentFlow.edges,
      isPublic: newApp.isPublic
    });
  };

  const handleExecuteApp = () => {
    if (!selectedApp) return;

    try {
      const inputData = executionInput ? JSON.parse(executionInput) : {};
      executeAppMutation.mutate({
        appId: selectedApp,
        inputData
      });
    } catch (error) {
      toast({
        title: "Invalid Input",
        description: "Please check your input JSON format",
        variant: "destructive"
      });
    }
  };

  const loadApp = (app: AgentApp) => {
    setSelectedApp(app.id);
    if (app.flowDefinition) {
      setCurrentFlow({
        nodes: app.flowDefinition.nodes || [],
        edges: app.flowDefinition.edges || []
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Visual Agent App Builder</h1>
            <p className="text-muted-foreground">
              Build complex agent workflows with a visual drag-and-drop interface
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New App
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Agent App</DialogTitle>
                <DialogDescription>
                  Create a new visual agent application workflow
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-name">App Name</Label>
                  <Input
                    id="app-name"
                    value={newApp.name}
                    onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                    placeholder="My Agent App"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="app-description">Description</Label>
                  <Textarea
                    id="app-description"
                    value={newApp.description}
                    onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                    placeholder="Describe what this app does..."
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-public"
                    checked={newApp.isPublic}
                    onChange={(e) => setNewApp({ ...newApp, isPublic: e.target.checked })}
                  />
                  <Label htmlFor="is-public">Make this app public</Label>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateApp} disabled={createAppMutation.isPending}>
                    {createAppMutation.isPending ? "Creating..." : "Create App"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{apps.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Apps</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
            <p className="text-xs text-muted-foreground">Executions Today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <GitBranch className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">{currentFlow.nodes.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Nodes in Canvas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <ArrowRight className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">{currentFlow.edges.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Connections</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Existing Apps</CardTitle>
              <CardDescription>Load and manage your agent apps</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {appsLoading ? (
                    <p className="text-center text-muted-foreground">Loading apps...</p>
                  ) : apps.length === 0 ? (
                    <p className="text-center text-muted-foreground">
                      No apps found. Create one to get started.
                    </p>
                  ) : (
                    apps.map((app: AgentApp) => (
                      <Card 
                        key={app.id} 
                        className={`p-3 cursor-pointer transition-colors ${
                          selectedApp === app.id ? 'bg-primary/5 border-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => loadApp(app)}
                      >
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">{app.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {app.description}
                          </p>
                          <div className="flex items-center justify-between">
                            {app.isPublic && (
                              <Badge variant="outline" className="text-xs">Public</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Node Palette</CardTitle>
              <CardDescription>Drag nodes to build your workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {nodeTypes.map((nodeType) => {
                  const Icon = nodeType.icon;
                  return (
                    <div
                      key={nodeType.type}
                      className={`p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${nodeType.color} hover:opacity-80`}
                      onClick={() => addNode(nodeType.type)}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{nodeType.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Visual Canvas</CardTitle>
              <CardDescription>
                Design your agent workflow by connecting nodes
              </CardDescription>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  onClick={() => setCurrentFlow({ nodes: [], edges: [] })}
                  variant="outline"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
                <Button size="sm" variant="outline">
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-96 p-4 relative overflow-hidden bg-gray-50">
                {currentFlow.nodes.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Drag nodes from the palette to start building</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-full">
                    {/* Render nodes */}
                    {currentFlow.nodes.map((node) => {
                      const nodeTypeConfig = nodeTypes.find(nt => nt.type === node.type);
                      const Icon = nodeTypeConfig?.icon || Square;
                      
                      return (
                        <div
                          key={node.id}
                          className={`absolute p-2 border-2 rounded-lg bg-white shadow-sm cursor-move ${nodeTypeConfig?.color || 'bg-gray-100 border-gray-300'}`}
                          style={{
                            left: node.position.x,
                            top: node.position.y,
                            minWidth: '120px'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Icon className="h-3 w-3" />
                              <span className="text-xs font-medium">{node.data.label}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0"
                              onClick={() => removeNode(node.id)}
                            >
                              <Trash2 className="h-2 w-2" />
                            </Button>
                          </div>
                          
                          {node.type === 'agent' && (
                            <div className="mt-1">
                              <select 
                                className="text-xs w-full"
                                value={node.data.agentId || ''}
                                onChange={(e) => {
                                  const updatedNodes = currentFlow.nodes.map(n => 
                                    n.id === node.id 
                                      ? { ...n, data: { ...n.data, agentId: e.target.value } }
                                      : n
                                  );
                                  setCurrentFlow({ ...currentFlow, nodes: updatedNodes });
                                }}
                              >
                                <option value="">Select Agent</option>
                                {agents.map((agent: any) => (
                                  <option key={agent.id} value={agent.id}>
                                    {agent.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Render edges */}
                    <svg className="absolute inset-0 pointer-events-none">
                      {currentFlow.edges.map((edge) => {
                        const sourceNode = currentFlow.nodes.find(n => n.id === edge.source);
                        const targetNode = currentFlow.nodes.find(n => n.id === edge.target);
                        
                        if (!sourceNode || !targetNode) return null;
                        
                        const startX = sourceNode.position.x + 60;
                        const startY = sourceNode.position.y + 20;
                        const endX = targetNode.position.x + 60;
                        const endY = targetNode.position.y + 20;
                        
                        return (
                          <line
                            key={edge.id}
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="#6366f1"
                            strokeWidth={2}
                            markerEnd="url(#arrowhead)"
                          />
                        );
                      })}
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill="#6366f1"
                          />
                        </marker>
                      </defs>
                    </svg>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>App Execution</CardTitle>
              <CardDescription>Test and run your agent app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="execution-input">Input Data (JSON)</Label>
                <Textarea
                  id="execution-input"
                  value={executionInput}
                  onChange={(e) => setExecutionInput(e.target.value)}
                  className="h-24 font-mono text-sm"
                  placeholder='{"message": "Hello world"}'
                />
              </div>
              
              <Button 
                onClick={handleExecuteApp}
                disabled={!selectedApp || executeAppMutation.isPending}
                className="w-full"
              >
                {executeAppMutation.isPending ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute App
                  </>
                )}
              </Button>
              
              {executionResults && (
                <div className="space-y-2">
                  <Label>Execution Results</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={executionResults.status === 'completed' ? 'default' : 'destructive'}>
                        {executionResults.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ID: {executionResults.executionId}
                      </span>
                    </div>
                    
                    {executionResults.results && (
                      <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                        {JSON.stringify(executionResults.results, null, 2)}
                      </pre>
                    )}
                    
                    {executionResults.error && (
                      <p className="text-xs text-red-600">{executionResults.error}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}