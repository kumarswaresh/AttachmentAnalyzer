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
import { 
  Plus, Play, Save, Settings, Trash2, MousePointer2, 
  Bot, Database, GitBranch, Shuffle, Merge, Brain, 
  Code, Zap, Loader2, ArrowRight, Circle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const NODE_TYPES = {
  agent: { icon: Bot, color: "bg-blue-500", name: "Agent" },
  connector: { icon: Database, color: "bg-green-500", name: "Connector" },
  condition: { icon: GitBranch, color: "bg-yellow-500", name: "Condition" },
  parallel: { icon: Shuffle, color: "bg-purple-500", name: "Parallel" },
  merge: { icon: Merge, color: "bg-orange-500", name: "Merge" },
  memory: { icon: Brain, color: "bg-pink-500", name: "Memory" },
  transform: { icon: Code, color: "bg-indigo-500", name: "Transform" },
  trigger: { icon: Zap, color: "bg-red-500", name: "Trigger" }
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

export default function EnhancedAgentAppBuilder() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [executionData, setExecutionData] = useState<Record<string, any>>({});
  
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
    const gridSize = 180;
    const cols = 4;
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
  }, [appForm.flowDefinition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedNode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const newY = Math.max(0, e.clientY - rect.top - dragOffset.y);
    
    updateNode(draggedNode, { position: { x: newX, y: newY } });
  }, [draggedNode, dragOffset, updateNode]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Execution simulation
  const startExecution = async () => {
    setIsRunning(true);
    setExecutionData({});
    
    // Simulate execution with visual feedback
    for (const node of appForm.flowDefinition) {
      setExecutionData(prev => ({ ...prev, [node.id]: { status: 'running' } }));
      await new Promise(resolve => setTimeout(resolve, 800));
      setExecutionData(prev => ({ ...prev, [node.id]: { status: 'completed' } }));
    }
    
    setIsRunning(false);
    toast({ title: "Execution completed successfully" });
  };

  const selectedNodeData = selectedNode ? 
    appForm.flowDefinition.find(node => node.id === selectedNode) : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Visual Agent App Builder</h1>
          <p className="text-muted-foreground">Create sophisticated multi-agent workflows with drag-and-drop</p>
        </div>
        <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Agent App
        </Button>
      </div>

      <Tabs defaultValue="builder" className="w-full">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="gallery">App Gallery</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(agentApps as any)?.map((app: any) => (
              <Card key={app.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <CardDescription>{app.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">{app.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {app.flowDefinition?.length || 0} components
                    </div>
                    <Button
                      size="sm"
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

        <TabsContent value="builder" className="space-y-4">
          {isEditing ? (
            <div className="grid grid-cols-12 gap-6 h-[800px]">
              {/* Toolbar */}
              <div className="col-span-12 flex items-center justify-between bg-white dark:bg-gray-800 border rounded-lg p-4">
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
                    onClick={() => {
                      selectedApp ? 
                        updateApp.mutate({ id: selectedApp, ...appForm }) : 
                        createApp.mutate(appForm);
                    }}
                    disabled={createApp.isPending || updateApp.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Canvas */}
              <div className="col-span-9 relative">
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <div 
                      ref={canvasRef}
                      className="relative w-full h-full bg-gray-50 dark:bg-gray-900 overflow-auto"
                      style={{
                        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      {/* Render connections */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {connections.map((connection) => {
                          const fromNode = appForm.flowDefinition.find(n => n.id === connection.from);
                          const toNode = appForm.flowDefinition.find(n => n.id === connection.to);
                          
                          if (!fromNode || !toNode) return null;
                          
                          const x1 = fromNode.position.x + 120;
                          const y1 = fromNode.position.y + 40;
                          const x2 = toNode.position.x;
                          const y2 = toNode.position.y + 40;
                          
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
                            className={`absolute cursor-move border-2 rounded-lg p-3 bg-white dark:bg-gray-800 shadow-lg min-w-[120px] ${
                              selectedNode === node.id ? 'border-blue-500' : 'border-gray-200'
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
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-8 h-8 rounded-full ${nodeType?.color || 'bg-gray-500'} flex items-center justify-center text-white`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{node.name}</div>
                                <div className="text-xs text-muted-foreground">{nodeType?.name || node.type}</div>
                              </div>
                            </div>
                            
                            {/* Input ports */}
                            {node.inputs.map((input, index) => (
                              <div
                                key={input}
                                className="absolute w-3 h-3 bg-gray-400 rounded-full -left-1.5"
                                style={{ top: 20 + index * 20 }}
                              />
                            ))}
                            
                            {/* Output ports */}
                            {node.outputs.map((output, index) => (
                              <div
                                key={output}
                                className="absolute w-3 h-3 bg-blue-500 rounded-full -right-1.5"
                                style={{ top: 20 + index * 20 }}
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
                          <div className="text-center">
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
                  </CardContent>
                </Card>
              </div>

              {/* Properties Panel */}
              <div className="col-span-3 space-y-4">
                {selectedNodeData ? (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm">Component Settings</CardTitle>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteNode(selectedNodeData.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Component Name</Label>
                        <Input
                          value={selectedNodeData.name}
                          onChange={(e) => updateNode(selectedNodeData.id, { name: e.target.value })}
                        />
                      </div>
                      
                      {selectedNodeData.type === 'agent' && (
                        <div>
                          <Label>Select Agent</Label>
                          <Select
                            value={selectedNodeData.config.agentId || ""}
                            onValueChange={(value) => updateNode(selectedNodeData.id, {
                              config: { ...selectedNodeData.config, agentId: value }
                            })}
                          >
                            <SelectTrigger>
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
                        <div className="space-y-3">
                          <div>
                            <Label>Memory Type</Label>
                            <Select
                              value={selectedNodeData.config.memoryType || "vector"}
                              onValueChange={(value) => updateNode(selectedNodeData.id, {
                                config: { ...selectedNodeData.config, memoryType: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vector">Vector Memory</SelectItem>
                                <SelectItem value="conversation">Conversation Memory</SelectItem>
                                <SelectItem value="episodic">Episodic Memory</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Settings className="w-8 h-8 mx-auto mb-2" />
                        <p>Select a component to configure</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
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
          )}
        </TabsContent>
      </Tabs>

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
                  className="h-20 flex-col gap-2"
                  onClick={() => addComponent(type)}
                >
                  <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{config.name}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}