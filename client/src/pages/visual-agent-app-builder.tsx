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
  // AI Agents
  agent: { icon: Bot, color: "bg-blue-500", name: "AI Agent", description: "Custom AI agent", category: "AI" },
  
  // Flow Control
  condition: { icon: GitBranch, color: "bg-yellow-500", name: "Condition", description: "Conditional logic", category: "Flow" },
  parallel: { icon: Shuffle, color: "bg-purple-500", name: "Parallel", description: "Parallel execution", category: "Flow" },
  merge: { icon: Merge, color: "bg-orange-500", name: "Merge", description: "Merge results", category: "Flow" },
  
  // Data & Memory
  memory: { icon: Brain, color: "bg-pink-500", name: "Memory", description: "Memory storage", category: "Data" },
  transform: { icon: Code, color: "bg-indigo-500", name: "Transform", description: "Data transformation", category: "Data" },
  database: { icon: Database, color: "bg-slate-500", name: "Database", description: "Database operations", category: "Data" },
  
  // MCP Integrations
  weather: { icon: Bot, color: "bg-sky-500", name: "Weather API", description: "Weather data integration", category: "MCP" },
  serpapi: { icon: Bot, color: "bg-emerald-500", name: "SerpAPI", description: "Google search & trends", category: "MCP" },
  trends: { icon: Bot, color: "bg-violet-500", name: "Trend Analysis", description: "Market trend analysis", category: "MCP" },
  
  // Backend Integration
  backend_api: { icon: Bot, color: "bg-red-500", name: "Backend API", description: "Your backend endpoints", category: "Integration" },
  mcp_server: { icon: Bot, color: "bg-teal-500", name: "MCP Server", description: "Custom MCP server", category: "Integration" },
  
  // Databases
  user_db: { icon: Database, color: "bg-blue-600", name: "User Database", description: "User data operations", category: "Database" },
  order_db: { icon: Database, color: "bg-green-600", name: "Order Database", description: "Order management", category: "Database" },
  geo_db: { icon: Database, color: "bg-purple-600", name: "Geospatial DB", description: "Location-based data", category: "Database" }
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
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
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
    // Smart positioning - place near last component or start from left
    let newX = 100;
    let newY = 100;
    
    if (appForm.flowDefinition.length > 0) {
      const lastComponent = appForm.flowDefinition[appForm.flowDefinition.length - 1];
      newX = lastComponent.position.x + 200; // Place to the right of last component
      newY = lastComponent.position.y + Math.random() * 100 - 50; // Slight vertical offset
    }

    const newComponent: FlowNode = {
      id: `${type}-${Date.now()}`,
      type,
      name: `${NODE_TYPES[type as keyof typeof NODE_TYPES]?.name || type} ${appForm.flowDefinition.length + 1}`,
      position: { x: newX, y: newY },
      config: {},
      inputs: type === 'agent' ? ['input'] : type === 'condition' ? ['condition'] : ['data'],
      outputs: type === 'condition' ? ['true', 'false'] : type === 'parallel' ? ['branch1', 'branch2'] : ['output']
    };

    setAppForm(prev => ({
      ...prev,
      flowDefinition: [...prev.flowDefinition, newComponent]
    }));
    setShowComponentSelector(false);
    setSelectedNode(newComponent.id);
    
    // Auto-scroll to new component
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.scrollTo({
          left: Math.max(0, newX - 200),
          top: Math.max(0, newY - 200),
          behavior: 'smooth'
        });
      }
    }, 100);
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

  // Component filtering
  const categories = ["All", ...Array.from(new Set(Object.values(NODE_TYPES).map(t => t.category)))];
  const filteredComponents = Object.entries(NODE_TYPES).filter(([type, config]) => {
    const matchesSearch = config.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
                         config.description.toLowerCase().includes(componentSearch.toLowerCase());
    const matchesCategory = selectedCategory === "All" || config.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get selected node data
  const selectedNodeData = selectedNode ? 
    appForm.flowDefinition.find(node => node.id === selectedNode) : null;

  // Save app function
  const saveApp = async () => {
    try {
      const appData = {
        ...appForm,
        flowDefinition: appForm.flowDefinition,
        connections: connections
      };
      await createApp.mutateAsync(appData);
    } catch (error) {
      toast({ 
        title: "Save failed", 
        description: "Could not save the agent app",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header Toolbar */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Visual Agent Builder
          </h1>
          <Input
            placeholder="Enter workflow name..."
            value={appForm.name}
            onChange={(e) => setAppForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-64 border-blue-200 focus:border-blue-400 focus:ring-blue-200"
          />
          <Badge variant="secondary" className="px-3 py-1 bg-blue-100 text-blue-700 border-blue-200">
            {appForm.flowDefinition.length} Components
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            className="bg-green-500 hover:bg-green-600 text-white shadow-md transition-all duration-200 hover:shadow-lg"
            size="sm"
            onClick={() => setShowComponentSelector(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Component
          </Button>
          <Button
            className={isRunning ? 
              "bg-red-500 hover:bg-red-600 text-white shadow-md" : 
              "bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all duration-200 hover:shadow-lg"
            }
            size="sm"
            onClick={startExecution}
            disabled={appForm.flowDefinition.length === 0}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Running
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Test Run
              </>
            )}
          </Button>
          <Button
            className="bg-purple-500 hover:bg-purple-600 text-white shadow-md transition-all duration-200 hover:shadow-lg"
            size="sm"
            onClick={saveApp}
            disabled={createApp.isPending}
          >
            {createApp.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save App
          </Button>
        </div>
      </div>

      {/* Full Width Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Canvas Area */}
        <div className="flex-1 relative bg-gray-50 overflow-hidden">
          <div 
            ref={canvasRef}
            className="w-full h-full bg-gray-50 overflow-auto p-6"
            style={{
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              minHeight: '100%',
              minWidth: '200%' // Allow horizontal scrolling
            }}
            onClick={(e) => {
              // Only deselect if clicking on empty canvas, not on components
              if (e.target === e.currentTarget) {
                setSelectedNode(null);
              }
            }}
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
                
                const fromX = fromNode.position.x + 160;
                const fromY = fromNode.position.y + 50;
                const toX = toNode.position.x;
                const toY = toNode.position.y + 50;
                
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
                    width: 160,
                    minHeight: 100
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node.id);
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-full ${nodeType?.color || 'bg-gray-500'} flex items-center justify-center text-white`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium truncate">{node.name}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      {nodeType?.category}
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
                      style={{ top: 30 + index * 25 }}
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
                      style={{ top: 30 + index * 25 }}
                      title={`Output: ${output}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!connectorDrawing) {
                          const rect = canvasRef.current?.getBoundingClientRect();
                          if (rect) {
                            const portX = node.position.x + 160;
                            const portY = node.position.y + 30 + index * 25;
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
                  <MousePointer2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-medium mb-2">Empty Canvas</h3>
                  <p className="text-muted-foreground mb-4">Click "Add Component" to start building your agent workflow</p>
                  <Button size="lg" onClick={() => setShowComponentSelector(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Add First Component
                  </Button>
                </div>
              </div>
            )}

            {/* Properties Panel - Floating when component selected */}
            {selectedNode && selectedNodeData && (
              <div 
                className="absolute top-4 right-4 w-96 bg-white rounded-lg border shadow-lg z-50"
                onClick={(e) => e.stopPropagation()} // Prevent panel from closing when clicked
              >
                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h3 className="font-semibold text-blue-800">Component Properties</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteNode(selectedNode)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedNode(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                  <div>
                    <Label className="text-sm font-medium">Component Name</Label>
                    <Input
                      value={selectedNodeData.name}
                      onChange={(e) => updateNode(selectedNode, { name: e.target.value })}
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <div className="mt-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm font-medium text-blue-700">
                      {NODE_TYPES[selectedNodeData.type as keyof typeof NODE_TYPES]?.name}
                    </div>
                  </div>

                  {selectedNodeData.type === 'agent' && (
                    <div>
                      <Label className="text-sm font-medium">Select Agent</Label>
                      <Select
                        value={selectedNodeData.config.agentId || ""}
                        onValueChange={(value) => updateNode(selectedNode, {
                          config: { ...selectedNodeData.config, agentId: value }
                        })}
                      >
                        <SelectTrigger className="mt-1" onClick={(e) => e.stopPropagation()}>
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

                  {(selectedNodeData.type === 'backend_api' || selectedNodeData.type === 'weather' || selectedNodeData.type === 'serpapi' || selectedNodeData.type === 'trends') && (
                    <div>
                      <Label className="text-sm font-medium">API Configuration</Label>
                      <Textarea
                        placeholder={
                          selectedNodeData.type === 'backend_api' ? 
                          "Configure your backend API endpoints and tokens...\nExample:\nEndpoint: /api/users\nToken: your-api-key" :
                          selectedNodeData.type === 'weather' ?
                          "Weather API Configuration:\nAPI Key: your-weather-api-key\nLocation: city name or coordinates" :
                          selectedNodeData.type === 'serpapi' ?
                          "SerpAPI Configuration:\nAPI Key: your-serpapi-key\nSearch Query: your search terms" :
                          "Trend Analysis Configuration:\nData Source: specify your trend data source\nMetrics: define metrics to track"
                        }
                        value={selectedNodeData.config.apiConfig || ""}
                        onChange={(e) => updateNode(selectedNode, {
                          config: { ...selectedNodeData.config, apiConfig: e.target.value }
                        })}
                        className="mt-1"
                        rows={4}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {(selectedNodeData.type === 'user_db' || selectedNodeData.type === 'order_db' || selectedNodeData.type === 'geo_db') && (
                    <div>
                      <Label className="text-sm font-medium">Database Configuration</Label>
                      <Textarea
                        placeholder={
                          selectedNodeData.type === 'user_db' ? 
                          "User Database Configuration:\nOperation: SELECT, INSERT, UPDATE, DELETE\nTable: users\nConditions: WHERE clause" :
                          selectedNodeData.type === 'order_db' ?
                          "Order Database Configuration:\nOperation: SELECT, INSERT, UPDATE, DELETE\nTable: orders\nConditions: WHERE clause" :
                          "Geospatial Database Configuration:\nOperation: spatial queries\nTable: locations\nRadius: search radius in km"
                        }
                        value={selectedNodeData.config.dbConfig || ""}
                        onChange={(e) => updateNode(selectedNode, {
                          config: { ...selectedNodeData.config, dbConfig: e.target.value }
                        })}
                        className="mt-1"
                        rows={4}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Connect to Component</Label>
                    <Select
                      value=""
                      onValueChange={(targetNodeId) => {
                        if (targetNodeId && targetNodeId !== selectedNode) {
                          const targetNode = appForm.flowDefinition.find(n => n.id === targetNodeId);
                          if (targetNode) {
                            const newConnection: Connection = {
                              id: `${selectedNode}-${targetNodeId}-${Date.now()}`,
                              from: selectedNode,
                              to: targetNodeId,
                              fromPort: selectedNodeData.outputs[0] || 'output',
                              toPort: targetNode.inputs[0] || 'input'
                            };
                            setConnections(prev => [...prev, newConnection]);
                            toast({ title: `Connected to ${targetNode.name}` });
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1" onClick={(e) => e.stopPropagation()}>
                        <SelectValue placeholder="Select component to connect" />
                      </SelectTrigger>
                      <SelectContent>
                        {appForm.flowDefinition
                          .filter(node => node.id !== selectedNode)
                          .map((node) => (
                            <SelectItem key={node.id} value={node.id}>
                              {node.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Quick Actions</Label>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => {
                          const availableNodes = appForm.flowDefinition.filter(n => n.id !== selectedNode);
                          if (availableNodes.length > 0) {
                            const targetNode = availableNodes[availableNodes.length - 1];
                            const newConnection: Connection = {
                              id: `${selectedNode}-${targetNode.id}-${Date.now()}`,
                              from: selectedNode,
                              to: targetNode.id,
                              fromPort: selectedNodeData.outputs[0] || 'output',
                              toPort: targetNode.inputs[0] || 'input'
                            };
                            setConnections(prev => [...prev, newConnection]);
                            toast({ title: "Auto-connected to last component" });
                          }
                        }}
                      >
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Auto Connect
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          // Duplicate component
                          const duplicatedComponent: FlowNode = {
                            ...selectedNodeData,
                            id: `${selectedNodeData.type}-${Date.now()}`,
                            name: `${selectedNodeData.name} Copy`,
                            position: {
                              x: selectedNodeData.position.x + 200,
                              y: selectedNodeData.position.y + 50
                            }
                          };
                          setAppForm(prev => ({
                            ...prev,
                            flowDefinition: [...prev.flowDefinition, duplicatedComponent]
                          }));
                          toast({ title: "Component duplicated" });
                        }}
                      >
                        <Circle className="w-3 h-3 mr-1" />
                        Duplicate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Component Selector Dialog */}
      <Dialog open={showComponentSelector} onOpenChange={setShowComponentSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Component</DialogTitle>
            <DialogDescription>
              Search and select components to add to your agent workflow
            </DialogDescription>
          </DialogHeader>
          
          {/* Search and Filter */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search components..."
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Component Grid */}
          <div className="flex-1 overflow-y-auto">
            {categories.filter(cat => cat !== "All").map(category => {
              const categoryComponents = filteredComponents.filter(([, config]) => config.category === category);
              if (categoryComponents.length === 0) return null;
              
              return (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    {category === "AI" && <Bot className="w-4 h-4" />}
                    {category === "Flow" && <GitBranch className="w-4 h-4" />}
                    {category === "Data" && <Database className="w-4 h-4" />}
                    {category === "MCP" && <Zap className="w-4 h-4" />}
                    {category === "Integration" && <Link2 className="w-4 h-4" />}
                    {category === "Database" && <Database className="w-4 h-4" />}
                    {category} Components
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categoryComponents.map(([type, config]) => {
                      const IconComponent = config.icon;
                      return (
                        <Button
                          key={type}
                          variant="outline"
                          className="h-24 flex-col gap-2 text-center hover:bg-gray-50 p-3"
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
              );
            })}
            
            {filteredComponents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="w-12 h-12 mx-auto mb-2" />
                <p>No components found matching your search</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}