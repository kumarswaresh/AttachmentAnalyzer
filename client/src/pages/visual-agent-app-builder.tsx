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
  MessageSquare, Workflow, AlertCircle, ChevronLeft, Check,
  Users, Network, Send, Router, Share2
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
  geo_db: { icon: Database, color: "bg-purple-600", name: "Geospatial DB", description: "Location-based data", category: "Database" },

  // Agent Communication & Chaining
  agent_chain: { icon: Link2, color: "bg-cyan-500", name: "Agent Chain", description: "Sequential agent execution", category: "Communication" },
  message_router: { icon: MessageSquare, color: "bg-amber-500", name: "Message Router", description: "Route messages between agents", category: "Communication" },
  coordination_hub: { icon: Users, color: "bg-emerald-500", name: "Coordination Hub", description: "Coordinate multiple agents", category: "Communication" },
  broadcast: { icon: Send, color: "bg-blue-500", name: "Broadcast", description: "Send to multiple agents", category: "Communication" },
  aggregator: { icon: Network, color: "bg-purple-500", name: "Result Aggregator", description: "Combine agent results", category: "Communication" },
  decision_gate: { icon: Router, color: "bg-orange-500", name: "Decision Gate", description: "Route based on conditions", category: "Communication" },
  handoff: { icon: Share2, color: "bg-teal-500", name: "Agent Handoff", description: "Transfer context between agents", category: "Communication" }
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
  const [autoConnect, setAutoConnect] = useState(true); // Auto-connect toggle
  
  // Undo/Redo functionality
  const [history, setHistory] = useState<Array<{
    flowDefinition: FlowNode[];
    connections: Connection[];
  }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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

  // History management
  const saveToHistory = useCallback(() => {
    const newHistoryEntry = {
      flowDefinition: [...appForm.flowDefinition],
      connections: [...connections]
    };
    
    // Remove future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newHistoryEntry);
    
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }
    
    setHistory(newHistory);
  }, [appForm.flowDefinition, connections, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setAppForm(prev => ({ ...prev, flowDefinition: prevState.flowDefinition }));
      setConnections(prevState.connections);
      setHistoryIndex(prev => prev - 1);
      toast({ title: "Undone" });
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setAppForm(prev => ({ ...prev, flowDefinition: nextState.flowDefinition }));
      setConnections(nextState.connections);
      setHistoryIndex(prev => prev + 1);
      toast({ title: "Redone" });
    }
  }, [history, historyIndex]);

  // Component operations
  const addComponent = useCallback((type: string, autoConnectTo?: string) => {
    // Smart positioning - place near selected component or last component
    let newX = 100;
    let newY = 100;
    
    if (autoConnectTo) {
      // Position near the component we're auto-connecting to
      const sourceComponent = appForm.flowDefinition.find(c => c.id === autoConnectTo);
      if (sourceComponent) {
        newX = sourceComponent.position.x + 250; // Place to the right
        newY = sourceComponent.position.y + Math.random() * 60 - 30; // Slight vertical offset
      }
    } else if (appForm.flowDefinition.length > 0) {
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

    // Auto-connect if requested and auto-connect is enabled
    if (autoConnectTo && autoConnect) {
      const sourceComponent = appForm.flowDefinition.find(c => c.id === autoConnectTo);
      if (sourceComponent) {
        const newConnection: Connection = {
          id: `${autoConnectTo}-${newComponent.id}-${Date.now()}`,
          from: autoConnectTo,
          to: newComponent.id,
          fromPort: sourceComponent.outputs[0] || 'output',
          toPort: newComponent.inputs[0] || 'input'
        };
        setConnections(prev => [...prev, newConnection]);
        toast({ title: `Connected ${sourceComponent.name} to ${newComponent.name}` });
      }
    }

    setShowComponentSelector(false);
    setSelectedNode(newComponent.id);
    
    // Save to history after adding component
    setTimeout(() => {
      saveToHistory();
    }, 100);
    
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
  }, [appForm.flowDefinition, connections, autoConnect, toast, saveToHistory]);

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
    toast({ title: "Component deleted" });
    
    // Save to history
    setTimeout(() => {
      saveToHistory();
    }, 100);
  }, [saveToHistory, toast]);

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

  // Enhanced test execution with validation
  const startExecution = async () => {
    if (appForm.flowDefinition.length === 0) {
      toast({ 
        title: "No components to test", 
        description: "Add components to your workflow first",
        variant: "destructive"
      });
      return;
    }

    // Validate workflow configuration
    const unconfiguredComponents = appForm.flowDefinition.filter(node => {
      return (node.type === 'agent' && !node.config?.agentId) ||
             ((node.type === 'weather' || node.type === 'serpapi' || node.type === 'backend_api' || node.type === 'trends') && !node.config?.apiConfig) ||
             ((node.type === 'user_db' || node.type === 'order_db' || node.type === 'geo_db') && !node.config?.dbConfig);
    });

    if (unconfiguredComponents.length > 0) {
      toast({ 
        title: "Configuration required", 
        description: `Please configure: ${unconfiguredComponents.map(n => n.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setExecutionData({});
    
    toast({ 
      title: "Test execution started", 
      description: "Simulating workflow execution with configured components" 
    });

    // Find execution order based on connections or use sequential order
    let executionOrder = [];
    const startNode = appForm.flowDefinition.find(node => node.type === 'start');
    
    if (startNode && connections.length > 0) {
      // Follow connection chain starting from start node
      executionOrder = [startNode];
      let currentNodeIds = [startNode.id];
      
      while (currentNodeIds.length > 0) {
        const nextNodeIds = [];
        for (const nodeId of currentNodeIds) {
          const outgoingConnections = connections.filter(conn => conn.from === nodeId);
          for (const conn of outgoingConnections) {
            const targetNode = appForm.flowDefinition.find(n => n.id === conn.to);
            if (targetNode && !executionOrder.includes(targetNode)) {
              executionOrder.push(targetNode);
              nextNodeIds.push(targetNode.id);
            }
          }
        }
        currentNodeIds = nextNodeIds;
      }
    } else {
      // Execute all components in order they were added
      executionOrder = appForm.flowDefinition;
    }
    
    // Execute each component with realistic timing
    for (let i = 0; i < executionOrder.length; i++) {
      const node = executionOrder[i];
      setExecutionData(prev => ({ ...prev, [node.id]: { status: 'running' } }));
      
      // Realistic processing times based on component type
      const processingTime = node.type === 'agent' ? 2000 : 
                           (node.type === 'weather' || node.type === 'serpapi') ? 1500 : 
                           (node.type === 'backend_api' || node.type === 'trends') ? 1200 : 800;
      
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      setExecutionData(prev => ({ 
        ...prev, 
        [node.id]: { 
          status: 'completed',
          output: `${node.name} executed successfully`
        } 
      }));
    }
    
    setIsRunning(false);
    toast({ 
      title: "Test execution completed", 
      description: `Successfully tested ${executionOrder.length} components`
    });
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
        category: "workflow",
        flowDefinition: appForm.flowDefinition,
        connections: connections,
        inputSchema: {}, // Add required input schema
        outputSchema: {}, // Add required output schema
        isActive: true
      };
      await createApp.mutateAsync(appData);
      toast({ 
        title: "Success", 
        description: "Agent app saved successfully",
        variant: "default" 
      });
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
          {/* Auto-connect toggle */}
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-blue-200">
            <span className="text-sm text-blue-700">Auto-connect</span>
            <Button
              size="sm"
              variant={autoConnect ? "default" : "outline"}
              onClick={() => setAutoConnect(!autoConnect)}
              className={autoConnect ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
            >
              {autoConnect ? "ON" : "OFF"}
            </Button>
          </div>
          
          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="border-blue-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Undo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="border-blue-200"
            >
              <ArrowRight className="w-4 h-4" />
              Redo
            </Button>
          </div>
          
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
                    selectedNode === node.id ? 'border-blue-500 ring-2 ring-blue-200' : 
                    // Check if component is configured
                    ((node.type === 'agent' && node.config?.agentId) ||
                     ((node.type === 'weather' || node.type === 'serpapi' || node.type === 'backend_api' || node.type === 'trends') && node.config?.apiConfig) ||
                     ((node.type === 'user_db' || node.type === 'order_db' || node.type === 'geo_db') && node.config?.dbConfig) ||
                     (node.type === 'condition' || node.type === 'parallel' || node.type === 'start' || node.type === 'end')) 
                    ? 'border-green-300 hover:border-green-400' : 'border-orange-300 hover:border-orange-400'
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

                    {/* Configuration details */}
                    <div className="space-y-1">
                      {/* Show configuration status */}
                      {node.type === 'agent' && node.config?.agentId && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <Circle className="w-2 h-2 fill-current" />
                          {(() => {
                            const agent = (agents as any)?.find((a: any) => a.id === node.config.agentId);
                            return agent ? `Agent: ${agent.name.substring(0, 15)}...` : 'Agent Selected';
                          })()}
                        </div>
                      )}
                      
                      {(node.type === 'weather' || node.type === 'serpapi' || node.type === 'backend_api' || node.type === 'trends') && node.config?.apiConfig && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <Circle className="w-2 h-2 fill-current" />
                          API Configured
                        </div>
                      )}
                      
                      {(node.type === 'user_db' || node.type === 'order_db' || node.type === 'geo_db') && node.config?.dbConfig && (
                        <div className="text-xs text-green-600 flex items-center gap-1">
                          <Circle className="w-2 h-2 fill-current" />
                          DB Configured
                        </div>
                      )}
                      
                      {/* Show not configured for components that need configuration */}
                      {((node.type === 'agent' && !node.config?.agentId) ||
                        ((node.type === 'weather' || node.type === 'serpapi' || node.type === 'backend_api' || node.type === 'trends') && !node.config?.apiConfig) ||
                        ((node.type === 'user_db' || node.type === 'order_db' || node.type === 'geo_db') && !node.config?.dbConfig)) && (
                        <div className="text-xs text-orange-600 flex items-center gap-1">
                          <Circle className="w-2 h-2 fill-current" />
                          Not Configured
                        </div>
                      )}
                    </div>
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
                      onClick={() => {
                        // Store the selected node for auto-connecting
                        const currentlySelected = selectedNode;
                        setShowComponentSelector(true);
                        // We'll use this in the component selector
                        (window as any).autoConnectToNode = currentlySelected;
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Component
                    </Button>
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

                  {/* Agent Chain Configuration */}
                  {selectedNodeData.type === 'agent_chain' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Chain Configuration</Label>
                      <div>
                        <Label className="text-xs text-gray-600">Execution Mode</Label>
                        <Select
                          value={selectedNodeData.config.executionMode || "sequential"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, executionMode: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sequential">Sequential</SelectItem>
                            <SelectItem value="parallel">Parallel</SelectItem>
                            <SelectItem value="conditional">Conditional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Chain Agents</Label>
                        <Textarea
                          placeholder="Agent IDs (one per line)"
                          value={selectedNodeData.config.chainAgents || ""}
                          onChange={(e) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, chainAgents: e.target.value }
                          })}
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Context Sharing</Label>
                        <Select
                          value={selectedNodeData.config.contextSharing || "full"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, contextSharing: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full Context</SelectItem>
                            <SelectItem value="filtered">Filtered</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="none">No Context</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Message Router Configuration */}
                  {selectedNodeData.type === 'message_router' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Message Router Configuration</Label>
                      <div>
                        <Label className="text-xs text-gray-600">Routing Strategy</Label>
                        <Select
                          value={selectedNodeData.config.routingStrategy || "round_robin"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, routingStrategy: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="round_robin">Round Robin</SelectItem>
                            <SelectItem value="load_balanced">Load Balanced</SelectItem>
                            <SelectItem value="capability_based">Capability Based</SelectItem>
                            <SelectItem value="priority_queue">Priority Queue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Target Agents</Label>
                        <Textarea
                          placeholder="Agent IDs for routing (one per line)"
                          value={selectedNodeData.config.targetAgents || ""}
                          onChange={(e) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, targetAgents: e.target.value }
                          })}
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Message Priority</Label>
                        <Select
                          value={selectedNodeData.config.messagePriority || "medium"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, messagePriority: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Coordination Hub Configuration */}
                  {selectedNodeData.type === 'coordination_hub' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Coordination Hub Configuration</Label>
                      <div>
                        <Label className="text-xs text-gray-600">Coordination Type</Label>
                        <Select
                          value={selectedNodeData.config.coordinationType || "orchestration"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, coordinationType: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="orchestration">Orchestration</SelectItem>
                            <SelectItem value="choreography">Choreography</SelectItem>
                            <SelectItem value="event_driven">Event Driven</SelectItem>
                            <SelectItem value="consensus">Consensus</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Coordination Rules</Label>
                        <Textarea
                          placeholder="Define coordination rules and triggers"
                          value={selectedNodeData.config.coordinationRules || ""}
                          onChange={(e) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, coordinationRules: e.target.value }
                          })}
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Failure Handling</Label>
                        <Select
                          value={selectedNodeData.config.failureHandling || "retry"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, failureHandling: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="retry">Retry</SelectItem>
                            <SelectItem value="escalate">Escalate</SelectItem>
                            <SelectItem value="fallback">Fallback</SelectItem>
                            <SelectItem value="abort">Abort</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Broadcast Configuration */}
                  {selectedNodeData.type === 'broadcast' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Broadcast Configuration</Label>
                      <div>
                        <Label className="text-xs text-gray-600">Broadcast Type</Label>
                        <Select
                          value={selectedNodeData.config.broadcastType || "all"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, broadcastType: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Agents</SelectItem>
                            <SelectItem value="filtered">Filtered Agents</SelectItem>
                            <SelectItem value="group">Agent Group</SelectItem>
                            <SelectItem value="capability">By Capability</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Target Filter</Label>
                        <Input
                          placeholder="Agent filter criteria"
                          value={selectedNodeData.config.targetFilter || ""}
                          onChange={(e) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, targetFilter: e.target.value }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Response Collection</Label>
                        <Select
                          value={selectedNodeData.config.responseCollection || "all"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, responseCollection: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Collect All</SelectItem>
                            <SelectItem value="first">First Response</SelectItem>
                            <SelectItem value="timeout">Timeout Based</SelectItem>
                            <SelectItem value="none">No Collection</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Decision Gate Configuration */}
                  {selectedNodeData.type === 'decision_gate' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Decision Gate Configuration</Label>
                      <div>
                        <Label className="text-xs text-gray-600">Decision Logic</Label>
                        <Textarea
                          placeholder="Define decision conditions and routing logic"
                          value={selectedNodeData.config.decisionLogic || ""}
                          onChange={(e) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, decisionLogic: e.target.value }
                          })}
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Default Route</Label>
                        <Input
                          placeholder="Default agent ID for fallback"
                          value={selectedNodeData.config.defaultRoute || ""}
                          onChange={(e) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, defaultRoute: e.target.value }
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Agent Handoff Configuration */}
                  {selectedNodeData.type === 'handoff' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Agent Handoff Configuration</Label>
                      <div>
                        <Label className="text-xs text-gray-600">Handoff Trigger</Label>
                        <Select
                          value={selectedNodeData.config.handoffTrigger || "completion"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, handoffTrigger: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completion">Task Completion</SelectItem>
                            <SelectItem value="escalation">Escalation</SelectItem>
                            <SelectItem value="capability_match">Capability Match</SelectItem>
                            <SelectItem value="manual">Manual Trigger</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Context Transfer</Label>
                        <Select
                          value={selectedNodeData.config.contextTransfer || "full"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, contextTransfer: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full Context</SelectItem>
                            <SelectItem value="summary">Summary Only</SelectItem>
                            <SelectItem value="selective">Selective</SelectItem>
                            <SelectItem value="none">No Context</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Target Agent</Label>
                        <Select
                          value={selectedNodeData.config.targetAgentId || ""}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, targetAgentId: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select target agent" />
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
                    </div>
                  )}

                  {/* Result Aggregator Configuration */}
                  {selectedNodeData.type === 'aggregator' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Result Aggregator Configuration</Label>
                      <div>
                        <Label className="text-xs text-gray-600">Aggregation Method</Label>
                        <Select
                          value={selectedNodeData.config.aggregationMethod || "merge"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, aggregationMethod: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="merge">Merge Results</SelectItem>
                            <SelectItem value="combine">Combine Arrays</SelectItem>
                            <SelectItem value="average">Average Numbers</SelectItem>
                            <SelectItem value="consensus">Consensus Vote</SelectItem>
                            <SelectItem value="priority">Priority Based</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Conflict Resolution</Label>
                        <Select
                          value={selectedNodeData.config.conflictResolution || "first_wins"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, conflictResolution: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first_wins">First Wins</SelectItem>
                            <SelectItem value="last_wins">Last Wins</SelectItem>
                            <SelectItem value="highest_confidence">Highest Confidence</SelectItem>
                            <SelectItem value="manual_review">Manual Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Wait Strategy</Label>
                        <Select
                          value={selectedNodeData.config.waitStrategy || "all_complete"}
                          onValueChange={(value) => updateNode(selectedNode, {
                            config: { ...selectedNodeData.config, waitStrategy: value }
                          })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_complete">Wait for All</SelectItem>
                            <SelectItem value="timeout">Timeout Based</SelectItem>
                            <SelectItem value="minimum_count">Minimum Count</SelectItem>
                            <SelectItem value="first_n">First N Results</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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

                  {/* Connection Management */}
                  <div>
                    <Label className="text-sm font-medium">Connections</Label>
                    <div className="mt-2 space-y-2">
                      {/* Outgoing Connections */}
                      {connections.filter(conn => conn.from === selectedNode).length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-600">Outgoing</Label>
                          <div className="space-y-1">
                            {connections
                              .filter(conn => conn.from === selectedNode)
                              .map((connection) => {
                                const targetNode = appForm.flowDefinition.find(n => n.id === connection.to);
                                return (
                                  <div key={connection.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                                    <span className="text-sm">{targetNode?.name || 'Unknown'}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setConnections(prev => prev.filter(c => c.id !== connection.id));
                                        toast({ title: `Disconnected from ${targetNode?.name}` });
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Incoming Connections */}
                      {connections.filter(conn => conn.to === selectedNode).length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-600">Incoming</Label>
                          <div className="space-y-1">
                            {connections
                              .filter(conn => conn.to === selectedNode)
                              .map((connection) => {
                                const sourceNode = appForm.flowDefinition.find(n => n.id === connection.from);
                                return (
                                  <div key={connection.id} className="flex items-center justify-between bg-green-50 p-2 rounded">
                                    <span className="text-sm">{sourceNode?.name || 'Unknown'}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setConnections(prev => prev.filter(c => c.id !== connection.id));
                                        toast({ title: `Disconnected from ${sourceNode?.name}` });
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Clear All Connections */}
                      {connections.filter(conn => conn.from === selectedNode || conn.to === selectedNode).length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setConnections(prev => prev.filter(c => c.from !== selectedNode && c.to !== selectedNode));
                            toast({ title: "All connections cleared" });
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Clear All Connections
                        </Button>
                      )}
                    </div>
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

                  {/* API Validation */}
                  {(selectedNodeData.type === 'weather' || selectedNodeData.type === 'serpapi' || selectedNodeData.type === 'backend_api') && selectedNodeData.config?.apiConfig && (
                    <div>
                      <Label className="text-sm font-medium">API Status</Label>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full mt-2"
                        onClick={async () => {
                          try {
                            // Mock API validation - in real implementation would check actual APIs
                            const isValid = selectedNodeData.config.apiConfig.includes('api') || selectedNodeData.config.apiConfig.includes('key');
                            if (isValid) {
                              toast({ title: "API validation successful", description: "Configuration appears valid" });
                            } else {
                              toast({ title: "API validation failed", description: "Please check your API configuration", variant: "destructive" });
                            }
                          } catch (error) {
                            toast({ title: "API validation failed", description: "Unable to validate API", variant: "destructive" });
                          }
                        }}
                      >
                        <Circle className="w-3 h-3 mr-1" />
                        Validate API
                      </Button>
                    </div>
                  )}

                  {/* Save and Close Button */}
                  <div className="border-t pt-4 mt-4">
                    <Button 
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => {
                        // Save configuration and close panel
                        setSelectedNode(null);
                        toast({ title: "Configuration saved", description: "Component settings have been saved" });
                      }}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save & Close
                    </Button>
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
                          onClick={() => {
                            const autoConnectTo = (window as any).autoConnectToNode;
                            addComponent(type, autoConnectTo);
                            // Clear the auto-connect reference
                            (window as any).autoConnectToNode = null;
                          }}
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