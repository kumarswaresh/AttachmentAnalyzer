import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Play,
  Save,
  Plus,
  Trash2,
  Settings,
  Eye,
  GitBranch,
  Database,
  Zap,
  Filter,
  Merge,
  Brain,
  Code,
  ArrowRight,
  MousePointer2,
  Grid3X3,
  Layers,
  Search,
  Link,
  Webhook,
  Globe,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";

interface AgentFlowNode {
  id: string;
  type: 'agent' | 'connector' | 'condition' | 'parallel' | 'merge' | 'memory' | 'transform' | 'trigger';
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
  status?: 'idle' | 'running' | 'completed' | 'error';
  webhook?: string;
  endpoint?: string;
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
    nextNode?: string;
  }>;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  fromOutput: string;
  toInput: string;
  bidirectional?: boolean;
}

interface ComponentTemplate {
  type: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  defaultConfig: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

interface AgentApp {
  id: string;
  name: string;
  description: string;
  category: string;
  flowDefinition: AgentFlowNode[];
  inputSchema: object;
  outputSchema: object;
  isActive: boolean;
  executionCount: number;
  avgExecutionTime: number;
}

const NODE_TYPES = {
  agent: { icon: Brain, color: "bg-blue-500", label: "Agent" },
  connector: { icon: Database, color: "bg-green-500", label: "Connector" },
  condition: { icon: GitBranch, color: "bg-yellow-500", label: "Condition" },
  parallel: { icon: Layers, color: "bg-purple-500", label: "Parallel" },
  merge: { icon: Merge, color: "bg-orange-500", label: "Merge" },
  memory: { icon: Brain, color: "bg-indigo-500", label: "Memory" },
  transform: { icon: Code, color: "bg-red-500", label: "Transform" },
  trigger: { icon: Webhook, color: "bg-pink-500", label: "Trigger" }
};

export default function AgentAppBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [executionData, setExecutionData] = useState<Record<string, any>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [selectedNodeForAgent, setSelectedNodeForAgent] = useState<string | null>(null);
  
  const [appForm, setAppForm] = useState({
    name: "",
    description: "",
    category: "custom",
    flowDefinition: [] as AgentFlowNode[],
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object", properties: {} }
  });

  // Component templates for the searchable selector
  const componentTemplates: ComponentTemplate[] = [
    {
      type: 'trigger',
      name: 'HTTP Trigger',
      description: 'Start workflow with HTTP webhook',
      icon: Webhook,
      category: 'Triggers',
      defaultConfig: { method: 'POST', path: '/webhook' },
      inputs: [],
      outputs: ['data']
    },
    {
      type: 'agent',
      name: 'LLM Agent',
      description: 'AI agent with language model',
      icon: Brain,
      category: 'Agents',
      defaultConfig: { model: 'gpt-4', temperature: 0.7 },
      inputs: ['prompt', 'context'],
      outputs: ['response', 'metadata']
    },
    {
      type: 'connector',
      name: 'API Connector',
      description: 'Connect to external APIs',
      icon: Globe,
      category: 'Connectors',
      defaultConfig: { url: '', method: 'GET' },
      inputs: ['request'],
      outputs: ['response']
    },
    {
      type: 'memory',
      name: 'Vector Memory',
      description: 'Store and retrieve semantic data',
      icon: Database,
      category: 'Memory',
      defaultConfig: { dimension: 1536 },
      inputs: ['query', 'data'],
      outputs: ['results']
    },
    {
      type: 'condition',
      name: 'Conditional Logic',
      description: 'Branch workflow based on conditions',
      icon: GitBranch,
      category: 'Logic',
      defaultConfig: { operator: 'equals' },
      inputs: ['value'],
      outputs: ['true', 'false']
    },
    {
      type: 'transform',
      name: 'Data Transform',
      description: 'Transform and process data',
      icon: Code,
      category: 'Processing',
      defaultConfig: { script: '' },
      inputs: ['input'],
      outputs: ['output']
    }
  ];

  // Fetch agent apps
  const { data: agentApps = [] } = useQuery({
    queryKey: ["/api/agent-apps"],
  });

  // Fetch agents for node configuration
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
  });

  // Fetch connectors for node configuration
  const { data: connectors = [] } = useQuery({
    queryKey: ["/api/mcp-connectors"],
  });

  // Component connection functions
  const startConnection = (nodeId: string) => {
    setIsConnecting(true);
    setConnectionStart(nodeId);
    toast({
      title: "Connection Mode",
      description: "Click on another component to create a connection",
    });
  };

  const finishConnection = (endNodeId: string) => {
    if (!connectionStart || connectionStart === endNodeId) {
      setIsConnecting(false);
      setConnectionStart(null);
      return;
    }

    const newConnection: Connection = {
      id: crypto.randomUUID(),
      from: connectionStart,
      to: endNodeId,
      fromOutput: 'output',
      toInput: 'input',
      bidirectional: false
    };

    setConnections(prev => [...prev, newConnection]);
    setIsConnecting(false);
    setConnectionStart(null);
    
    toast({
      title: "Connection Created",
      description: "Connected components successfully",
    });
  };

  const cancelConnection = () => {
    setIsConnecting(false);
    setConnectionStart(null);
  };

  // Visual flow execution with highlighting
  const executeFlowVisualization = async (startNodeId: string) => {
    const visited = new Set<string>();
    const queue = [startNodeId];
    
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);
      
      // Highlight current node
      setHighlightedNodes(new Set([currentNodeId]));
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find connected nodes
      const nextNodes = connections
        .filter(conn => conn.from === currentNodeId)
        .map(conn => conn.to);
      
      queue.push(...nextNodes);
    }
    
    // Clear highlighting after execution
    setTimeout(() => setHighlightedNodes(new Set()), 500);
  };

  // Agent selection for LLM components
  const openAgentSelector = (nodeId: string) => {
    setSelectedNodeForAgent(nodeId);
    setShowAgentSelector(true);
  };

  const selectAgentForNode = (agentId: string, agentName: string) => {
    setNodes(prev => 
      prev.map(node => 
        node.id === selectedNodeForAgent 
          ? { ...node, config: { ...node.config, agentId, agentName } }
          : node
      )
    );
    setShowAgentSelector(false);
    setSelectedNodeForAgent(null);
    
    toast({
      title: "Agent Selected",
      description: `Assigned ${agentName} to component`,
    });
  };

  // Create agent app mutation
  const createApp = useMutation({
    mutationFn: (appData: any) => apiRequest("POST", "/api/agent-apps", appData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-apps"] });
      toast({ title: "Success", description: "Agent app created successfully" });
      setIsEditing(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create agent app: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update agent app mutation
  const updateApp = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/agent-apps/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-apps"] });
      toast({ title: "Success", description: "Agent app updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update agent app: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Execute agent app mutation
  const executeApp = useMutation({
    mutationFn: ({ id, input, context }: any) => 
      apiRequest("POST", `/api/agent-apps/${id}/execute`, { input, context }),
    onSuccess: (result) => {
      toast({ 
        title: "Execution Started", 
        description: `Agent app execution initiated: ${result.id}` 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Execution Failed",
        description: `Failed to execute agent app: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAppForm({
      name: "",
      description: "",
      category: "custom",
      flowDefinition: [],
      inputSchema: { type: "object", properties: {} },
      outputSchema: { type: "object", properties: {} }
    });
    setSelectedNode(null);
  };

  const loadApp = (app: AgentApp) => {
    setAppForm({
      name: app.name,
      description: app.description,
      category: app.category,
      flowDefinition: app.flowDefinition,
      inputSchema: app.inputSchema,
      outputSchema: app.outputSchema
    });
    setSelectedApp(app.id);
    setIsEditing(true);
  };

  // Add component from template
  const addComponent = useCallback((template: ComponentTemplate) => {
    const newNode: AgentFlowNode = {
      id: Math.random().toString(36).substr(2, 9),
      type: template.type as any,
      name: template.name,
      position: { x: 200, y: 200 },
      config: template.defaultConfig,
      inputs: template.inputs,
      outputs: template.outputs,
      status: 'idle',
      webhook: template.type === 'trigger' ? `/webhook/${Math.random().toString(36).substr(2, 9)}` : undefined,
      endpoint: `/api/nodes/${Math.random().toString(36).substr(2, 9)}`
    };

    setAppForm(prev => ({
      ...prev,
      flowDefinition: [...prev.flowDefinition, newNode]
    }));
    setShowComponentSelector(false);
    setSearchQuery("");
  }, []);

  // Filter components by search query
  const filteredComponents = componentTemplates.filter(component =>
    component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    component.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    component.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Start execution with real-time visualization
  const startExecution = useCallback(() => {
    setIsRunning(true);
    setExecutionData({});
    
    // Simulate execution flow with real data visualization
    appForm.flowDefinition.forEach((node, index) => {
      setTimeout(() => {
        setExecutionData(prev => ({
          ...prev,
          [node.id]: {
            status: 'running',
            data: `Processing ${node.name}...`,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Update node status
        setAppForm(prev => ({
          ...prev,
          flowDefinition: prev.flowDefinition.map(n =>
            n.id === node.id ? { ...n, status: 'running' as const } : n
          )
        }));

        // Complete after delay
        setTimeout(() => {
          setExecutionData(prev => ({
            ...prev,
            [node.id]: {
              status: 'completed',
              data: `${node.name} completed successfully`,
              timestamp: new Date().toISOString()
            }
          }));
          
          setAppForm(prev => ({
            ...prev,
            flowDefinition: prev.flowDefinition.map(n =>
              n.id === node.id ? { ...n, status: 'completed' as const } : n
            )
          }));
        }, 2000);
      }, index * 1000);
    });

    // End execution
    setTimeout(() => {
      setIsRunning(false);
      toast({
        title: "Execution Complete",
        description: "Agent workflow executed successfully"
      });
    }, appForm.flowDefinition.length * 3000);
  }, [appForm.flowDefinition, toast]);

  const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addNode = useCallback((type: string, position: { x: number; y: number }) => {
    const newNode: AgentFlowNode = {
      id: generateNodeId(),
      type: type as any,
      name: `${NODE_TYPES[type as keyof typeof NODE_TYPES]?.label || type} Node`,
      position,
      config: {},
      inputs: [],
      outputs: []
    };

    setAppForm(prev => ({
      ...prev,
      flowDefinition: [...prev.flowDefinition, newNode]
    }));
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<AgentFlowNode>) => {
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
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const connectNodes = useCallback((fromId: string, toId: string) => {
    setAppForm(prev => ({
      ...prev,
      flowDefinition: prev.flowDefinition.map(node => {
        if (node.id === fromId) {
          return {
            ...node,
            outputs: [...new Set([...node.outputs, toId])]
          };
        }
        if (node.id === toId) {
          return {
            ...node,
            inputs: [...new Set([...node.inputs, fromId])]
          };
        }
        return node;
      })
    }));
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedNode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasOffset.x) / zoom;
    const y = (e.clientY - rect.top - canvasOffset.y) / zoom;

    addNode(draggedNode, { x, y });
    setDraggedNode(null);
  }, [draggedNode, canvasOffset, zoom, addNode]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const saveApp = () => {
    if (selectedApp) {
      updateApp.mutate({ id: selectedApp, ...appForm });
    } else {
      createApp.mutate(appForm);
    }
  };

  const executeAgentApp = () => {
    if (!selectedApp) return;
    
    const input = { message: "Test execution" };
    const context = {
      variables: { testMode: true },
      geoContext: { city: "San Francisco", country: "US" }
    };
    
    executeApp.mutate({ id: selectedApp, input, context });
  };

  const renderNode = (node: AgentFlowNode) => {
    const NodeIcon = NODE_TYPES[node.type]?.icon || Brain;
    const nodeColor = NODE_TYPES[node.type]?.color || "bg-gray-500";
    const isSelected = selectedNode === node.id;
    const isHighlighted = highlightedNodes.has(node.id);
    const isConnectionTarget = isConnecting && connectionStart !== node.id;

    return (
      <div
        key={node.id}
        className={`absolute bg-white border-2 rounded-lg p-3 cursor-pointer min-w-32 shadow-lg transition-all duration-300 ${
          isSelected ? 'border-blue-500 shadow-blue-200' : 
          isHighlighted ? 'border-green-500 shadow-green-200 bg-green-50' :
          isConnectionTarget ? 'border-yellow-500 shadow-yellow-200' :
          'border-gray-300'
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          transform: `scale(${zoom})`
        }}
        onClick={() => {
          if (isConnecting) {
            finishConnection(node.id);
          } else {
            setSelectedNode(node.id);
          }
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-6 h-6 ${nodeColor} rounded flex items-center justify-center`}>
            <NodeIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium truncate">{node.name}</span>
        </div>
        
        <div className="text-xs text-gray-500">
          {node.type}
          {node.config.agentName && (
            <div className="text-xs text-blue-600 font-medium">
              Agent: {node.config.agentName}
            </div>
          )}
        </div>
        
        {/* Component Action Buttons */}
        {isSelected && (
          <div className="absolute -right-2 top-0 flex flex-col gap-1">
            <Button
              size="sm"
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                startConnection(node.id);
              }}
              title="Connect to another component"
            >
              <Link className="w-3 h-3" />
            </Button>
            
            {node.type === 'agent' && (
              <Button
                size="sm"
                variant="outline"
                className="w-8 h-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  openAgentSelector(node.id);
                }}
                title="Select agent from catalog"
              >
                <Brain className="w-3 h-3" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                executeFlowVisualization(node.id);
              }}
              title="Execute flow from this component"
            >
              <Play className="w-3 h-3" />
            </Button>
          </div>
        )}
        
        {/* Connection points */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
      </div>
    );
  };

  const renderConnections = () => {
    return appForm.flowDefinition.map(node => 
      node.outputs.map(outputId => {
        const targetNode = appForm.flowDefinition.find(n => n.id === outputId);
        if (!targetNode) return null;

        const startX = node.position.x + 64; // Half node width
        const startY = node.position.y + 80; // Node height
        const endX = targetNode.position.x + 64;
        const endY = targetNode.position.y;

        return (
          <svg
            key={`${node.id}-${outputId}`}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
          >
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
                  fill="#6b7280"
                />
              </marker>
            </defs>
            <path
              d={`M ${startX} ${startY} Q ${startX} ${startY + 50} ${endX} ${endY}`}
              stroke="#6b7280"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        );
      })
    ).flat();
  };

  const selectedNodeData = selectedNode 
    ? appForm.flowDefinition.find(n => n.id === selectedNode)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agent App Builder</h1>
          <p className="text-muted-foreground">
            Create comprehensive multi-agent applications with visual flow design
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setIsEditing(true);
              resetForm();
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New App
          </Button>
          {selectedApp && (
            <Button onClick={executeAgentApp} variant="secondary" className="gap-2">
              <Play className="w-4 h-4" />
              Test Run
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="apps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apps">My Apps</TabsTrigger>
          <TabsTrigger value="builder">Visual Builder</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentApps.map((app: AgentApp) => (
              <Card key={app.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                      <CardDescription>{app.description}</CardDescription>
                    </div>
                    <Badge variant={app.isActive ? "default" : "secondary"}>
                      {app.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="capitalize">{app.category}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Executions:</span>
                      <span>{app.executionCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Time:</span>
                      <span>{app.avgExecutionTime}ms</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => loadApp(app)}
                        className="flex-1"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedApp(app.id);
                          executeAgentApp();
                        }}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Run
                      </Button>
                    </div>
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
                  <h3 className="text-lg font-semibold">{appForm.name || "Untitled App"}</h3>
                  <Badge variant="outline">{appForm.category}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowComponentSelector(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Component
                  </Button>
                  <Button
                    variant={isRunning ? "destructive" : "default"}
                    size="sm"
                    onClick={startExecution}
                    disabled={appForm.flowDefinition.length === 0}
                    className="flex items-center gap-2"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Test Run
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const formData = {
                        ...appForm,
                        connections
                      };
                      selectedApp ? updateApp.mutate({ id: selectedApp, ...formData }) : createApp.mutate(formData);
                    }}
                    disabled={createApp.isPending || updateApp.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
              {/* Canvas */}
              <div className="col-span-10 relative">
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <div 
                      ref={canvasRef}
                      className="relative w-full h-full bg-gray-50 dark:bg-gray-900 overflow-hidden"
                      style={{
                        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }}
                      onMouseMove={(e) => {
                        if (draggedNode && canvasRef.current) {
                          const rect = canvasRef.current.getBoundingClientRect();
                          const newX = e.clientX - rect.left - canvasOffset.x;
                          const newY = e.clientY - rect.top - canvasOffset.y;
                          
                          setAppForm(prev => ({
                            ...prev,
                            flowDefinition: prev.flowDefinition.map(node =>
                              node.id === draggedNode
                                ? { ...node, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
                                : node
                            )
                          }));
                        }
                      }}
                      onMouseUp={() => {
                        setDraggedNode(null);
                        setCanvasOffset({ x: 0, y: 0 });
                      }}
                    >
                      {/* Render nodes */}
                      {appForm.flowDefinition.map((node) => {
                        const nodeType = NODE_TYPES[node.type] || NODE_TYPES.agent;
                        const IconComponent = nodeType.icon;
                        const executionInfo = executionData[node.id];
                        
                        return (
                          <div
                            key={node.id}
                            className={`absolute bg-white dark:bg-gray-800 border-2 rounded-lg p-4 shadow-lg cursor-move min-w-[200px] transition-all duration-200 ${
                              selectedNode === node.id ? 'border-blue-500 shadow-blue-200' : 'border-gray-200 dark:border-gray-600'
                            } ${
                              node.status === 'running' ? 'border-yellow-400 shadow-yellow-200' : 
                              node.status === 'completed' ? 'border-green-400 shadow-green-200' :
                              node.status === 'error' ? 'border-red-400 shadow-red-200' : ''
                            }`}
                            style={{
                              left: node.position.x,
                              top: node.position.y,
                              transform: `scale(${zoom})`
                            }}
                            onClick={() => setSelectedNode(node.id)}
                            onMouseDown={(e) => {
                              setDraggedNode(node.id);
                              const rect = canvasRef.current?.getBoundingClientRect();
                              if (rect) {
                                setCanvasOffset({
                                  x: e.clientX - rect.left - node.position.x,
                                  y: e.clientY - rect.top - node.position.y
                                });
                              }
                            }}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded ${nodeType.color} text-white`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{node.name}</h4>
                                <p className="text-xs text-gray-500">{nodeType.label}</p>
                              </div>
                              {node.status && (
                                <div className="flex items-center gap-1">
                                  {node.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />}
                                  {node.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                  {node.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                </div>
                              )}
                            </div>
                            
                            {/* Input/Output ports */}
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col gap-1">
                                {node.inputs.map((input, idx) => (
                                  <div key={idx} className="w-3 h-3 bg-blue-400 rounded-full border-2 border-white cursor-pointer" />
                                ))}
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                {node.outputs.map((output, idx) => (
                                  <div key={idx} className="w-3 h-3 bg-green-400 rounded-full border-2 border-white cursor-pointer" />
                                ))}
                              </div>
                            </div>
                            
                            {/* Execution data visualization */}
                            {isRunning && executionInfo && (
                              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                <div className="font-medium">{executionInfo.status}</div>
                                <div className="text-gray-600 dark:text-gray-300">{executionInfo.data}</div>
                                <div className="text-gray-500 text-xs">{new Date(executionInfo.timestamp).toLocaleTimeString()}</div>
                              </div>
                            )}
                            
                            {/* Webhook/Endpoint info */}
                            {node.webhook && (
                              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                  <Webhook className="w-3 h-3" />
                                  {node.webhook}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Connections */}
                      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
                        {connections.map((connection) => {
                          const fromNode = appForm.flowDefinition.find(n => n.id === connection.from);
                          const toNode = appForm.flowDefinition.find(n => n.id === connection.to);
                          
                          if (!fromNode || !toNode) return null;
                          
                          const fromX = fromNode.position.x + 200;
                          const fromY = fromNode.position.y + 40;
                          const toX = toNode.position.x;
                          const toY = toNode.position.y + 40;
                          
                          return (
                            <line
                              key={connection.id}
                              x1={fromX}
                              y1={fromY}
                              x2={toX}
                              y2={toY}
                              stroke={connection.bidirectional ? "#8b5cf6" : "#6b7280"}
                              strokeWidth="2"
                              strokeDasharray={connection.bidirectional ? "5,5" : "none"}
                              markerEnd="url(#arrowhead)"
                            />
                          );
                        })}
                        
                        {/* Arrow marker */}
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
                              fill="#6b7280"
                            />
                          </marker>
                        </defs>
                      </svg>
                      
                      {/* Empty state */}
                      {appForm.flowDefinition.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Grid3X3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                              Build Your Agent Workflow
                            </h3>
                            <p className="text-gray-500 mb-4">
                              Click "Add Component" to start building your agent workflow
                            </p>
                            <Button 
                              onClick={() => setShowComponentSelector(true)}
                              className="flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Your First Component
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Properties Panel */}
              <div className="col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Node Palette</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(NODE_TYPES).map(([type, config]) => {
                      const IconComponent = config.icon;
                      return (
                        <div
                          key={type}
                          draggable
                          onDragStart={() => setDraggedNode(type)}
                          className={`flex items-center gap-2 p-2 rounded cursor-grab hover:bg-gray-50 ${config.color} text-white`}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span className="text-xs">{config.label}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Canvas Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Canvas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom(Math.min(zoom + 0.1, 2))}
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
                      >
                        -
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Zoom: {Math.round(zoom * 100)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Canvas */}
              <div className="col-span-7">
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">Flow Canvas</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveApp} disabled={createApp.isPending || updateApp.isPending}>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="h-full p-0">
                    <div
                      ref={canvasRef}
                      className="relative w-full h-full bg-gray-50 overflow-hidden"
                      onDrop={handleCanvasDrop}
                      onDragOver={handleCanvasDragOver}
                      style={{
                        backgroundImage: `
                          radial-gradient(circle, #d1d5db 1px, transparent 1px)
                        `,
                        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                        backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`
                      }}
                    >
                      {renderConnections()}
                      {appForm.flowDefinition.map(renderNode)}
                      
                      {appForm.flowDefinition.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <Grid3X3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Drag nodes from the palette to start building</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Properties Panel */}
              <div className="col-span-3 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">App Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="appName">Name</Label>
                      <Input
                        id="appName"
                        value={appForm.name}
                        onChange={(e) => setAppForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My Agent App"
                      />
                    </div>
                    <div>
                      <Label htmlFor="appDescription">Description</Label>
                      <Textarea
                        id="appDescription"
                        value={appForm.description}
                        onChange={(e) => setAppForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="App description..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="appCategory">Category</Label>
                      <Select
                        value={appForm.category}
                        onValueChange={(value) => setAppForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="analytics">Analytics</SelectItem>
                          <SelectItem value="customer_service">Customer Service</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {selectedNodeData && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm">Node Configuration</CardTitle>
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
                        <Label>Node Name</Label>
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
                              {agents.map((agent: any) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedNodeData.type === 'connector' && (
                        <div>
                          <Label>Select Connector</Label>
                          <Select
                            value={selectedNodeData.config.connectorId || ""}
                            onValueChange={(value) => updateNode(selectedNodeData.id, {
                              config: { ...selectedNodeData.config, connectorId: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a connector" />
                            </SelectTrigger>
                            <SelectContent>
                              {connectors.map((connector: any) => (
                                <SelectItem key={connector.id} value={connector.id}>
                                  {connector.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Geo-Travel Assistant</CardTitle>
                <CardDescription>
                  Multi-agent app for personalized travel recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <Badge variant="secondary">Hotel Agent</Badge>
                  <Badge variant="secondary">Flight Agent</Badge>
                  <Badge variant="secondary">Event Agent</Badge>
                </div>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Content Pipeline</CardTitle>
                <CardDescription>
                  Automated content creation and distribution workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <Badge variant="secondary">Content Agent</Badge>
                  <Badge variant="secondary">SEO Agent</Badge>
                  <Badge variant="secondary">Social Agent</Badge>
                </div>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Data Analysis Chain</CardTitle>
                <CardDescription>
                  End-to-end data processing and insights generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <Badge variant="secondary">Data Agent</Badge>
                  <Badge variant="secondary">Analytics Agent</Badge>
                  <Badge variant="secondary">Report Agent</Badge>
                </div>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Searchable Component Selector Dialog */}
      {showComponentSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Component</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComponentSelector(false)}
                >
                  ×
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {Object.entries(
                  filteredComponents.reduce((acc, component) => {
                    if (!acc[component.category]) {
                      acc[component.category] = [];
                    }
                    acc[component.category].push(component);
                    return acc;
                  }, {} as Record<string, ComponentTemplate[]>)
                ).map(([category, components]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {components.map((component) => {
                        const IconComponent = component.icon;
                        return (
                          <div
                            key={component.type}
                            className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                            onClick={() => addComponent(component)}
                          >
                            <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/20 mr-3">
                              <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{component.name}</h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {component.description}
                              </p>
                              <div className="flex gap-1 mt-1">
                                {component.inputs.length > 0 && (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                                    {component.inputs.length} inputs
                                  </span>
                                )}
                                {component.outputs.length > 0 && (
                                  <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                                    {component.outputs.length} outputs
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredComponents.length === 0 && (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No components found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agent Selector Dialog */}
      {showAgentSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Select Agent for Component</h3>
            
            <div className="space-y-3 mb-4">
              {/* Empty LLM Options */}
              <div className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">Empty LLM Agents</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => selectAgentForNode('gpt-4', 'GPT-4')}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    GPT-4 (Empty Agent)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => selectAgentForNode('claude-3', 'Claude-3')}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Claude-3 (Empty Agent)
                  </Button>
                </div>
              </div>

              {/* Agent Catalog */}
              <div className="border rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">Agent Catalog</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {agents.map((agent: any) => (
                    <Button
                      key={agent.id}
                      variant="outline"
                      className="w-full justify-start text-left"
                      onClick={() => selectAgentForNode(agent.id, agent.name)}
                    >
                      <Brain className="w-4 h-4 mr-2 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-gray-500">{agent.goal}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAgentSelector(false);
                  setSelectedNodeForAgent(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Mode Overlay */}
      {isConnecting && (
        <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 z-40">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium">Connection Mode Active</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Click another component to create connection
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full"
            onClick={cancelConnection}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}