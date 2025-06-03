import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Play, Save, Settings, Trash2, MousePointer2, 
  Bot, Database, GitBranch, Shuffle, Merge, Brain, 
  Code, Zap, Loader2, ArrowRight, ArrowLeft, Circle, Info,
  Menu, X, ChevronDown, ChevronRight, HelpCircle,
  BookOpen, Target, Link2, CheckCircle2, SkipForward,
  ArrowDown, ArrowUp, Eye, EyeOff, Lightbulb, 
  MessageSquare, Workflow, AlertCircle, ChevronLeft, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const NODE_TYPES = {
  agent: { icon: Bot, color: "bg-blue-500", name: "Agent", description: "AI agent component" },
  connector: { icon: Database, color: "bg-green-500", name: "Connector", description: "External API connector" },
  condition: { icon: GitBranch, color: "bg-yellow-500", name: "Condition", description: "Conditional logic" },
  parallel: { icon: Shuffle, color: "bg-purple-500", name: "Parallel", description: "Parallel execution" },
  merge: { icon: Merge, color: "bg-orange-500", name: "Merge", description: "Merge results" },
  memory: { icon: Brain, color: "bg-pink-500", name: "Memory", description: "Memory storage" },
  transform: { icon: Code, color: "bg-indigo-500", name: "Transform", description: "Data transformation" }
};

interface FlowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

interface Connection {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
}

export default function VisualAgentAppBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionData, setExecutionData] = useState<Record<string, any>>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectorDrawing, setConnectorDrawing] = useState<{
    from: string;
    fromPort: string;
    position: { x: number; y: number };
  } | null>(null);

  // App form state
  const [appForm, setAppForm] = useState({
    name: "New Workflow",
    description: "",
    flowDefinition: [] as FlowNode[],
    isActive: true
  });

  // Data fetching
  const { data: agents } = useQuery({ queryKey: ["/api/agents"] });
  const { data: connectors } = useQuery({ queryKey: ["/api/mcp-connectors"] });

  // Mutations
  const createApp = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/agent-apps", data),
    onSuccess: () => {
      toast({ title: "App created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-apps"] });
    }
  });

  const updateApp = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/agent-apps/${data.id}`, data),
    onSuccess: () => {
      toast({ title: "App updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-apps"] });
    }
  });

  // Component operations
  const addComponent = useCallback((type: string) => {
    const newComponent: FlowNode = {
      id: `${type}-${Date.now()}`,
      type,
      name: `${NODE_TYPES[type as keyof typeof NODE_TYPES]?.name || type} ${appForm.flowDefinition.length + 1}`,
      position: { 
        x: Math.max(50, Math.random() * 400), 
        y: Math.max(50, Math.random() * 300) 
      },
      config: {},
      inputs: type === 'agent' ? ['input'] : ['data'],
      outputs: type === 'condition' ? ['true', 'false'] : ['output']
    };

    setAppForm(prev => ({
      ...prev,
      flowDefinition: [...prev.flowDefinition, newComponent]
    }));
    setShowComponentSelector(false);
    setSelectedNode(newComponent.id);
  }, [appForm.flowDefinition.length]);

  const updateNode = useCallback((nodeId: string, updates: Partial<FlowNode>) => {
    setAppForm(prev => ({
      ...prev,
      flowDefinition: prev.flowDefinition.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setAppForm(prev => ({
      ...prev,
      flowDefinition: prev.flowDefinition.filter(node => node.id !== nodeId)
    }));
    setConnections(prev => prev.filter(conn => conn.from !== nodeId && conn.to !== nodeId));
    setSelectedNode(null);
  }, []);

  // Connection handling
  const startConnection = useCallback((nodeId: string, port: string, x: number, y: number) => {
    setConnectorDrawing({ from: nodeId, fromPort: port, position: { x, y } });
  }, []);

  const finishConnection = useCallback((toNodeId: string, toPort: string) => {
    if (connectorDrawing && connectorDrawing.from !== toNodeId) {
      const newConnection: Connection = {
        id: `${connectorDrawing.from}-${toNodeId}-${Date.now()}`,
        from: connectorDrawing.from,
        to: toNodeId,
        fromPort: connectorDrawing.fromPort,
        toPort: toPort
      };
      setConnections(prev => [...prev, newConnection]);
    }
    setConnectorDrawing(null);
  }, [connectorDrawing]);

  const updateConnectionPosition = useCallback((x: number, y: number) => {
    if (connectorDrawing) {
      setConnectorDrawing(prev => prev ? { ...prev, position: { x, y } } : null);
    }
  }, [connectorDrawing]);

  // Execution simulation
  const startExecution = async () => {
    setIsRunning(true);
    setExecutionData({});
    
    for (const node of appForm.flowDefinition) {
      setExecutionData(prev => ({ ...prev, [node.id]: { status: 'running' } }));
      await new Promise(resolve => setTimeout(resolve, 1000));
      setExecutionData(prev => ({ ...prev, [node.id]: { status: 'completed' } }));
    }
    
    setIsRunning(false);
    toast({ title: "Execution completed successfully" });
  };

  // Get selected node data
  const selectedNodeData = selectedNode ? 
    appForm.flowDefinition.find(node => node.id === selectedNode) : null;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <h1 className="text-xl font-semibold">Visual Agent Builder</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="flex items-center justify-between bg-white border-b p-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="App Name"
                value={appForm.name}
                onChange={(e) => setAppForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-48"
              />
              <Badge variant="outline" className="px-3 py-1">
                Workflow
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComponentSelector(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Component
              </Button>
              <Button
                variant={isRunning ? "destructive" : "default"}
                size="sm"
                onClick={startExecution}
                disabled={appForm.flowDefinition.length === 0}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Running
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Test Run
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => createApp.mutate(appForm)}
                disabled={createApp.isPending}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Component Gallery */}
            <div className={`
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
              lg:translate-x-0 fixed lg:relative z-30 w-80 bg-white border-r 
              transition-transform duration-300 ease-in-out h-full overflow-y-auto
            `}>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Component Gallery</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Click components to add to canvas
                </p>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(NODE_TYPES).map(([type, config]) => {
                    const IconComponent = config.icon;
                    return (
                      <Button
                        key={type}
                        variant="outline"
                        className="h-20 flex-col gap-2 text-center hover:bg-gray-50"
                        onClick={() => addComponent(type)}
                      >
                        <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{config.name}</div>
                          <div className="text-xs text-muted-foreground">{config.description}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative bg-gray-50 overflow-hidden">
              <div 
                ref={canvasRef}
                className="w-full h-full bg-gray-50 overflow-auto p-4"
                style={{
                  backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  minHeight: 'calc(100vh - 200px)',
                  minWidth: '100%'
                }}
                onClick={() => setSelectedNode(null)}
                onMouseMove={(e) => {
                  if (connectorDrawing) {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (rect) {
                      updateConnectionPosition(e.clientX - rect.left, e.clientY - rect.top);
                    }
                  }
                }}
              >
                {/* Render connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {connections.map((connection) => {
                    const fromNode = appForm.flowDefinition.find(n => n.id === connection.from);
                    const toNode = appForm.flowDefinition.find(n => n.id === connection.to);
                    
                    if (!fromNode || !toNode) return null;
                    
                    const fromX = fromNode.position.x + 140;
                    const fromY = fromNode.position.y + 40;
                    const toX = toNode.position.x;
                    const toY = toNode.position.y + 40;
                    
                    return (
                      <path
                        key={connection.id}
                        d={`M ${fromX} ${fromY} C ${fromX + 50} ${fromY} ${toX - 50} ${toY} ${toX} ${toY}`}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        fill="none"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}
                  
                  {/* Arrow marker definition */}
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
                        fill="#3b82f6"
                      />
                    </marker>
                  </defs>
                  
                  {/* Active connection being drawn */}
                  {connectorDrawing && (
                    <path
                      d={`M ${connectorDrawing.position.x} ${connectorDrawing.position.y} L ${connectorDrawing.position.x + 50} ${connectorDrawing.position.y}`}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      fill="none"
                    />
                  )}
                </svg>

                {/* Render nodes */}
                {appForm.flowDefinition.map((node) => {
                  const nodeType = NODE_TYPES[node.type as keyof typeof NODE_TYPES];
                  const IconComponent = nodeType?.icon || Bot;
                  const executionInfo = executionData[node.id];
                  
                  return (
                    <div
                      key={node.id}
                      className={`absolute bg-white rounded-lg border-2 shadow-sm cursor-pointer select-none ${
                        selectedNode === node.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                      } ${executionInfo?.status === 'running' ? 'ring-2 ring-blue-400' : ''} 
                      ${executionInfo?.status === 'completed' ? 'ring-2 ring-green-400' : ''}`}
                      style={{
                        left: node.position.x,
                        top: node.position.y,
                        width: 140,
                        minHeight: 80
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node.id);
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-full ${nodeType?.color || 'bg-gray-500'} flex items-center justify-center text-white`}>
                            <IconComponent className="w-3 h-3" />
                          </div>
                          <span className="text-sm font-medium truncate">{node.name}</span>
                        </div>
                        
                        {/* Configuration indicator */}
                        {node.config && Object.keys(node.config).length > 0 && (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <Circle className="w-2 h-2 fill-current" />
                            Configured
                          </div>
                        )}
                      </div>
                      
                      {/* Input ports */}
                      {node.inputs.map((input, index) => (
                        <div
                          key={input}
                          className="absolute w-3 h-3 bg-gray-400 rounded-full -left-1.5 border-2 border-white cursor-pointer hover:bg-gray-600 transition-colors"
                          style={{ top: 20 + index * 20 }}
                          title={`Input: ${input}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (connectorDrawing) {
                              finishConnection(node.id, input);
                            }
                          }}
                        />
                      ))}
                      
                      {/* Output ports */}
                      {node.outputs.map((output, index) => (
                        <div
                          key={output}
                          className="absolute w-3 h-3 bg-blue-500 rounded-full -right-1.5 border-2 border-white cursor-pointer hover:bg-blue-700 transition-colors"
                          style={{ top: 20 + index * 20 }}
                          title={`Output: ${output}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!connectorDrawing) {
                              const rect = canvasRef.current?.getBoundingClientRect();
                              if (rect) {
                                const portX = node.position.x + 140;
                                const portY = node.position.y + 20 + index * 20;
                                startConnection(node.id, output, portX, portY);
                              }
                            }
                          }}
                        />
                      ))}
                      
                      {executionInfo?.status === 'running' && (
                        <div className="absolute -top-2 -right-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {appForm.flowDefinition.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-8">
                      <MousePointer2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Empty Canvas</h3>
                      <p className="text-muted-foreground mb-4">Add components to start building your workflow</p>
                      <Button onClick={() => setShowComponentSelector(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Component
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Properties Panel */}
            <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
              <div className="p-4">
                {selectedNode && selectedNodeData ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm">Properties</CardTitle>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteNode(selectedNode)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">Component Name</Label>
                        <Input
                          value={selectedNodeData.name}
                          onChange={(e) => updateNode(selectedNode, { name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      
                      {selectedNodeData.type === 'agent' && (
                        <div>
                          <Label className="text-xs">Select Agent</Label>
                          <Select
                            value={selectedNodeData.config.agentId || ""}
                            onValueChange={(value) => updateNode(selectedNode, {
                              config: { ...selectedNodeData.config, agentId: value }
                            })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Choose an agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {(agents as any)?.map((agent: any) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs">Quick Connect</Label>
                        <div className="flex gap-2 mt-1">
                          <Button size="sm" variant="outline" className="flex-1">
                            <ArrowLeft className="w-3 h-3 mr-1" />
                            From
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <ArrowRight className="w-3 h-3 mr-1" />
                            To
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Workflow className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm font-medium mb-1">Welcome to Visual Builder</p>
                        <p className="text-xs">Add components and connect them to build workflows</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Component Selector Dialog */}
      <Dialog open={showComponentSelector} onOpenChange={setShowComponentSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
            <DialogDescription>
              Choose a component to add to your workflow
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {Object.entries(NODE_TYPES).map(([type, config]) => {
              const IconComponent = config.icon;
              return (
                <Button
                  key={type}
                  variant="outline"
                  className="h-20 flex-col gap-2 text-center"
                  onClick={() => addComponent(type)}
                >
                  <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{config.name}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}