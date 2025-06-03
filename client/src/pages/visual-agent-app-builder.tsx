import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, Play, Save, Settings, Trash2, MousePointer2, 
  Bot, Database, GitBranch, Shuffle, Merge, Brain, 
  Code, Zap, Loader2, ArrowRight, Circle, Info,
  Menu, X, ChevronDown, ChevronRight, HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const NODE_TYPES = {
  agent: { icon: Bot, color: "bg-blue-500", name: "Agent", description: "AI agent component" },
  connector: { icon: Database, color: "bg-green-500", name: "Connector", description: "External API connector" },
  condition: { icon: GitBranch, color: "bg-yellow-500", name: "Condition", description: "Conditional logic" },
  parallel: { icon: Shuffle, color: "bg-purple-500", name: "Parallel", description: "Parallel execution" },
  merge: { icon: Merge, color: "bg-orange-500", name: "Merge", description: "Merge multiple flows" },
  memory: { icon: Brain, color: "bg-pink-500", name: "Memory", description: "Store and retrieve data" },
  transform: { icon: Code, color: "bg-indigo-500", name: "Transform", description: "Transform data" },
  trigger: { icon: Zap, color: "bg-red-500", name: "Trigger", description: "Start workflow" }
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
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [executionData, setExecutionData] = useState<Record<string, any>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [appForm, setAppForm] = useState({
    name: "",
    description: "",
    category: "travel",
    flowDefinition: [] as FlowNode[],
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object", properties: {} },
    guardrails: []
  });

  // Fetch data
  const { data: agentApps } = useQuery({
    queryKey: ["/api/agent-apps"]
  });

  const { data: agents } = useQuery({ queryKey: ["/api/agents"] });
  const { data: connectors } = useQuery({ queryKey: ["/api/mcp-connectors"] });

  // Mutations
  const createApp = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/agent-apps", data),
    onSuccess: (response: any) => {
      toast({ title: "Agent app created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-apps"] });
      setSelectedApp(response.id);
      setIsEditing(false);
    },
    onError: () => toast({ title: "Failed to create agent app", variant: "destructive" })
  });

  const updateApp = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/agent-apps/${id}`, data),
    onSuccess: () => {
      toast({ title: "Agent app updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-apps"] });
      setIsEditing(false);
    },
    onError: () => toast({ title: "Failed to update agent app", variant: "destructive" })
  });

  // Component management
  const addComponent = useCallback((type: string) => {
    const existingNodes = appForm.flowDefinition;
    const gridSize = 200;
    const cols = Math.floor((window.innerWidth - 400) / gridSize);
    const nodeIndex = existingNodes.length;
    
    // Calculate grid position to prevent overlapping
    const x = 50 + (nodeIndex % cols) * gridSize;
    const y = 50 + Math.floor(nodeIndex / cols) * gridSize;
    
    const newComponent: FlowNode = {
      id: `${type}-${Date.now()}`,
      type,
      name: `${NODE_TYPES[type as keyof typeof NODE_TYPES]?.name || type} ${nodeIndex + 1}`,
      position: { x, y },
      config: {},
      inputs: type === 'trigger' ? [] : ['input'],
      outputs: type === 'condition' ? ['true', 'false'] : ['output'],
    };
    
    setAppForm(prev => ({
      ...prev,
      flowDefinition: [...prev.flowDefinition, newComponent]
    }));
    
    setSelectedNode(newComponent.id);
    setShowComponentSelector(false);
  }, [appForm.flowDefinition]);

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
    
    // Remove connections involving this node
    setConnections(prev => 
      prev.filter(conn => conn.from !== nodeId && conn.to !== nodeId)
    );
    
    setSelectedNode(null);
  }, []);

  // Drag and drop handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.target !== e.currentTarget && !(e.target as Element).closest('.node-header')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const node = appForm.flowDefinition.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - node.position.x;
    const offsetY = e.clientY - rect.top - node.position.y;
    
    setDraggedNode(nodeId);
    setDragOffset({ x: offsetX, y: offsetY });
    setSelectedNode(nodeId);
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [appForm.flowDefinition]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedNode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(rect.width - 120, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
    
    setAppForm(prev => ({
      ...prev,
      flowDefinition: prev.flowDefinition.map(node =>
        node.id === draggedNode ? { ...node, position: { x: newX, y: newY } } : node
      )
    }));
  }, [draggedNode, dragOffset]);

  const handleGlobalMouseUp = useCallback(() => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseMove]);

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // Execution simulation
  const startExecution = async () => {
    setIsRunning(true);
    setExecutionData({});
    
    // Simulate execution with visual feedback
    for (const node of appForm.flowDefinition) {
      setExecutionData(prev => ({ ...prev, [node.id]: { status: 'running' } }));
      await new Promise(resolve => setTimeout(resolve, 1000));
      setExecutionData(prev => ({ ...prev, [node.id]: { status: 'completed' } }));
    }
    
    setIsRunning(false);
    toast({ title: "Execution completed successfully" });
  };

  const selectedNodeData = selectedNode ? 
    appForm.flowDefinition.find(node => node.id === selectedNode) : null;

  const GuideContent = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          Agent App Builder Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div>
          <h4 className="font-medium">1. Adding Components</h4>
          <p className="text-muted-foreground">Click "Add Component" to add nodes to your workflow</p>
        </div>
        <div>
          <h4 className="font-medium">2. Component Types</h4>
          <ul className="text-muted-foreground space-y-1">
            <li>• <strong>Trigger:</strong> Start your workflow</li>
            <li>• <strong>Agent:</strong> Add AI agents to process tasks</li>
            <li>• <strong>Condition:</strong> Add branching logic</li>
            <li>• <strong>Memory:</strong> Store and retrieve data</li>
            <li>• <strong>Transform:</strong> Modify data between steps</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium">3. Chaining Agents</h4>
          <p className="text-muted-foreground">
            Drag components to position them. Connect output ports (right side) to input ports (left side) of the next component.
          </p>
        </div>
        <div>
          <h4 className="font-medium">4. Configuration</h4>
          <p className="text-muted-foreground">
            Click on any component to configure its settings in the properties panel.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
        <h1 className="text-lg font-semibold">Visual Agent Builder</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 fixed lg:relative z-30 w-80 bg-white border-r 
          transition-transform duration-300 ease-in-out h-full overflow-y-auto
        `}>
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Visual Agent Builder</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuide(!showGuide)}
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Create multi-agent workflows with drag-and-drop
            </p>
          </div>

          <div className="p-4 space-y-4">
            {showGuide && <GuideContent />}

            <Tabs defaultValue="gallery" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gallery">Apps</TabsTrigger>
                <TabsTrigger value="builder">Builder</TabsTrigger>
              </TabsList>

              <TabsContent value="gallery" className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">App Gallery</h3>
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    <Plus className="w-3 h-3 mr-1" />
                    New App
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {(agentApps as any)?.map((app: any) => (
                    <Card key={app.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-medium">{app.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {app.description}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {app.category}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            {app.flowDefinition?.length || 0} components
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApp(app.id);
                              setAppForm({
                                name: app.name,
                                description: app.description,
                                category: app.category,
                                flowDefinition: app.flowDefinition || [],
                                inputSchema: app.inputSchema || { type: "object", properties: {} },
                                outputSchema: app.outputSchema || { type: "object", properties: {} },
                                guardrails: app.guardrails || []
                              });
                              setIsEditing(true);
                              setSidebarOpen(false);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="builder" className="space-y-3 mt-4">
                {selectedNodeData ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm">Component Settings</CardTitle>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteNode(selectedNodeData.id)}
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
                          onChange={(e) => updateNode(selectedNodeData.id, { name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      
                      {selectedNodeData.type === 'agent' && (
                        <div>
                          <Label className="text-xs">Select Agent</Label>
                          <Select
                            value={selectedNodeData.config.agentId || ""}
                            onValueChange={(value) => updateNode(selectedNodeData.id, {
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

                      {selectedNodeData.type === 'memory' && (
                        <div>
                          <Label className="text-xs">Memory Type</Label>
                          <Select
                            value={selectedNodeData.config.memoryType || "vector"}
                            onValueChange={(value) => updateNode(selectedNodeData.id, {
                              config: { ...selectedNodeData.config, memoryType: value }
                            })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vector">Vector Memory</SelectItem>
                              <SelectItem value="conversation">Conversation Memory</SelectItem>
                              <SelectItem value="episodic">Episodic Memory</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedNodeData.type === 'condition' && (
                        <div>
                          <Label className="text-xs">Condition Logic</Label>
                          <Input
                            placeholder="e.g., response.confidence > 0.8"
                            value={selectedNodeData.config.condition || ""}
                            onChange={(e) => updateNode(selectedNodeData.id, {
                              config: { ...selectedNodeData.config, condition: e.target.value }
                            })}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Settings className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Select a component to configure</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isEditing && (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-white border-b p-4">
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="App Name"
                    value={appForm.name}
                    onChange={(e) => setAppForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-48"
                  />
                  <Select
                    value={appForm.category}
                    onValueChange={(value) => setAppForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowComponentSelector(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Add Component</span>
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
                        <span className="hidden sm:inline">Running</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Test Run</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectedApp ? 
                        updateApp.mutate({ id: selectedApp, ...appForm }) : 
                        createApp.mutate(appForm);
                    }}
                    disabled={createApp.isPending || updateApp.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative overflow-hidden">
                <div 
                  ref={canvasRef}
                  className="absolute inset-0 bg-gray-50 overflow-auto"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                  onClick={() => setSelectedNode(null)}
                >
                  {/* Render connections */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {connections.map((connection) => {
                      const fromNode = appForm.flowDefinition.find(n => n.id === connection.from);
                      const toNode = appForm.flowDefinition.find(n => n.id === connection.to);
                      
                      if (!fromNode || !toNode) return null;
                      
                      const x1 = fromNode.position.x + 140;
                      const y1 = fromNode.position.y + 50;
                      const x2 = toNode.position.x;
                      const y2 = toNode.position.y + 50;
                      
                      return (
                        <g key={connection.id}>
                          <path
                            d={`M ${x1} ${y1} C ${x1 + 50} ${y1} ${x2 - 50} ${y2} ${x2} ${y2}`}
                            stroke="#6366f1"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                          />
                        </g>
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

                  {/* Render nodes */}
                  {appForm.flowDefinition.map((node) => {
                    const nodeType = NODE_TYPES[node.type as keyof typeof NODE_TYPES];
                    const IconComponent = nodeType?.icon || Circle;
                    const executionInfo = executionData[node.id];
                    
                    return (
                      <div
                        key={node.id}
                        className={`absolute cursor-move border-2 rounded-lg bg-white shadow-lg min-w-[140px] select-none ${
                          selectedNode === node.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                        } ${
                          executionInfo?.status === 'running' ? 'ring-2 ring-blue-400 ring-opacity-75' : 
                          executionInfo?.status === 'completed' ? 'ring-2 ring-green-400 ring-opacity-75' : ''
                        }`}
                        style={{
                          left: node.position.x,
                          top: node.position.y,
                          zIndex: selectedNode === node.id ? 10 : 1
                        }}
                        onMouseDown={(e) => handleMouseDown(e, node.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNode(node.id);
                        }}
                      >
                        <div className="node-header p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-full ${nodeType?.color || 'bg-gray-500'} flex items-center justify-center text-white`}>
                              <IconComponent className="w-3 h-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{node.name}</div>
                              <div className="text-xs text-muted-foreground">{nodeType?.name || node.type}</div>
                            </div>
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
                            className="absolute w-3 h-3 bg-gray-400 rounded-full -left-1.5 border-2 border-white"
                            style={{ top: 20 + index * 20 }}
                            title={`Input: ${input}`}
                          />
                        ))}
                        
                        {/* Output ports */}
                        {node.outputs.map((output, index) => (
                          <div
                            key={output}
                            className="absolute w-3 h-3 bg-blue-500 rounded-full -right-1.5 border-2 border-white"
                            style={{ top: 20 + index * 20 }}
                            title={`Output: ${output}`}
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
            </>
          )}

          {!isEditing && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <MousePointer2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No App Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select an existing app or create a new one to start building
                </p>
                <Button onClick={() => setIsEditing(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New App
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Component Selector Dialog */}
      <Dialog open={showComponentSelector} onOpenChange={setShowComponentSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
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