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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Play, Save, Settings, Trash2, MousePointer2, 
  Bot, Database, GitBranch, Shuffle, Merge, Brain, 
  Code, Zap, Loader2, ArrowRight, Circle, Info,
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
  
  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialMode, setTutorialMode] = useState<'beginner' | 'advanced' | null>(null);
  const [highlightElement, setHighlightElement] = useState<string | null>(null);
  const [connectorDrawing, setConnectorDrawing] = useState<{
    from: string;
    fromPort: string;
    x: number;
    y: number;
  } | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [appForm, setAppForm] = useState({
    name: "",
    description: "",
    category: "workflow",
    flowDefinition: [] as FlowNode[],
    inputSchema: { type: "object", properties: {} },
    outputSchema: { type: "object", properties: {} },
    guardrails: []
  });

  // Smart component placement to avoid overlaps
  const getNextPosition = () => {
    if (appForm.flowDefinition.length === 0) {
      return { x: 100, y: 100 };
    }

    // Grid-based placement with intelligent positioning
    const gridSize = 180;
    const canvasWidth = 800;
    const cols = Math.floor(canvasWidth / gridSize);
    const row = Math.floor(appForm.flowDefinition.length / cols);
    const col = appForm.flowDefinition.length % cols;
    
    return {
      x: 80 + (col * gridSize),
      y: 80 + (row * gridSize)
    };
  };

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

  // Unified drag handlers for both mouse and touch events
  const startDrag = useCallback((clientX: number, clientY: number, nodeId: string) => {
    const node = appForm.flowDefinition.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left - node.position.x;
    const offsetY = clientY - rect.top - node.position.y;
    
    setDraggedNode(nodeId);
    setDragOffset({ x: offsetX, y: offsetY });
    setSelectedNode(nodeId);
    
    // Add both mouse and touch listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);
  }, [appForm.flowDefinition]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.target !== e.currentTarget && !(e.target as Element).closest('.node-header')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    startDrag(e.clientX, e.clientY, nodeId);
  }, [startDrag]);

  // Touch drag handlers for mobile support
  const handleTouchStart = useCallback((e: React.TouchEvent, nodeId: string) => {
    if (e.target !== e.currentTarget && !(e.target as Element).closest('.node-header')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    if (touch) {
      startDrag(touch.clientX, touch.clientY, nodeId);
    }
  }, [startDrag]);

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    if (!draggedNode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(rect.width - 120, clientX - rect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(rect.height - 80, clientY - rect.top - dragOffset.y));
    
    setAppForm(prev => ({
      ...prev,
      flowDefinition: prev.flowDefinition.map(node =>
        node.id === draggedNode ? { ...node, position: { x: newX, y: newY } } : node
      )
    }));
  }, [draggedNode, dragOffset]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    updateDragPosition(e.clientX, e.clientY);
  }, [updateDragPosition]);

  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    if (touch) {
      updateDragPosition(touch.clientX, touch.clientY);
    }
  }, [updateDragPosition]);

  const cleanupDrag = useCallback(() => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.removeEventListener('touchmove', handleGlobalTouchMove);
    document.removeEventListener('touchend', handleGlobalTouchEnd);
  }, []);

  const handleGlobalMouseUp = useCallback(() => {
    cleanupDrag();
  }, [cleanupDrag]);

  const handleGlobalTouchEnd = useCallback(() => {
    cleanupDrag();
  }, [cleanupDrag]);

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp, handleGlobalTouchMove, handleGlobalTouchEnd]);

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

  // Tutorial Data
  const TUTORIAL_STEPS = {
    beginner: [
      {
        id: 'welcome',
        title: 'Welcome to Agent Builder',
        description: 'Learn to create powerful AI workflows with drag-and-drop simplicity',
        target: null,
        content: 'This tutorial will guide you through creating your first agent workflow. You\'ll learn to add components, connect them, and configure AI agents.',
        action: 'Start Tutorial'
      },
      {
        id: 'add-trigger',
        title: 'Add a Trigger Component',
        description: 'Start your workflow with a trigger',
        target: 'add-component-btn',
        content: 'Every workflow starts with a trigger. Click "Add Component" and select "Trigger" to begin.',
        action: 'Add Trigger',
        validation: () => appForm.flowDefinition.some(node => node.type === 'trigger')
      },
      {
        id: 'add-agent',
        title: 'Add an AI Agent',
        description: 'Add intelligence to your workflow',
        target: 'add-component-btn',
        content: 'Now add an AI agent that will process your requests. Click "Add Component" and select "Agent".',
        action: 'Add Agent',
        validation: () => appForm.flowDefinition.some(node => node.type === 'agent')
      },
      {
        id: 'connect-components',
        title: 'Connect Components',
        description: 'Link your trigger to the agent',
        target: 'canvas',
        content: 'Connect the trigger output (blue circle on the right) to the agent input (gray circle on the left) by clicking and dragging.',
        action: 'Create Connection',
        validation: () => connections.length > 0
      },
      {
        id: 'configure-agent',
        title: 'Configure Your Agent',
        description: 'Set up the AI agent behavior',
        target: 'agent-config',
        content: 'Click on the agent component and select which AI agent to use from the dropdown in the properties panel.',
        action: 'Configure Agent',
        validation: () => {
          const agent = appForm.flowDefinition.find(node => node.type === 'agent');
          return agent && agent.config.agentId;
        }
      },
      {
        id: 'test-workflow',
        title: 'Test Your Workflow',
        description: 'Run your first agent workflow',
        target: 'test-btn',
        content: 'Great! Now test your workflow by clicking "Test Run" to see your agents in action.',
        action: 'Test Workflow',
        validation: () => isRunning || Object.keys(executionData).length > 0
      },
      {
        id: 'save-app',
        title: 'Save Your App',
        description: 'Save your workflow as an agent app',
        target: 'save-btn',
        content: 'Finally, give your app a name and click "Save" to store your workflow.',
        action: 'Save App',
        validation: () => appForm.name.length > 0
      }
    ],
    advanced: [
      {
        id: 'advanced-welcome',
        title: 'Advanced Agent Orchestration',
        description: 'Learn complex multi-agent patterns and optimization',
        target: null,
        content: 'This advanced tutorial covers multi-agent orchestration, conditional logic, memory management, and performance optimization.',
        action: 'Start Advanced Tutorial'
      },
      {
        id: 'parallel-agents',
        title: 'Parallel Processing',
        description: 'Run multiple agents simultaneously',
        target: 'add-component-btn',
        content: 'Add a "Parallel" component to run multiple agents at the same time for faster processing.',
        action: 'Add Parallel Component',
        validation: () => appForm.flowDefinition.some(node => node.type === 'parallel')
      },
      {
        id: 'conditional-logic',
        title: 'Conditional Branching',
        description: 'Add smart decision making',
        target: 'add-component-btn',
        content: 'Use "Condition" components to create smart workflows that branch based on results.',
        action: 'Add Condition',
        validation: () => appForm.flowDefinition.some(node => node.type === 'condition')
      },
      {
        id: 'memory-management',
        title: 'Agent Memory',
        description: 'Add persistent memory to your agents',
        target: 'add-component-btn',
        content: 'Add "Memory" components to store and retrieve information across workflow runs.',
        action: 'Add Memory',
        validation: () => appForm.flowDefinition.some(node => node.type === 'memory')
      },
      {
        id: 'data-transformation',
        title: 'Data Processing',
        description: 'Transform data between agents',
        target: 'add-component-btn',
        content: 'Use "Transform" components to modify data format and structure between processing steps.',
        action: 'Add Transform',
        validation: () => appForm.flowDefinition.some(node => node.type === 'transform')
      },
      {
        id: 'complex-workflow',
        title: 'Complete Workflow',
        description: 'Build a production-ready workflow',
        target: 'canvas',
        content: 'Connect all components to create a sophisticated multi-agent workflow with error handling and optimization.',
        action: 'Complete Workflow',
        validation: () => appForm.flowDefinition.length >= 5 && connections.length >= 3
      }
    ]
  };

  const currentTutorialSteps = tutorialMode ? TUTORIAL_STEPS[tutorialMode] : [];
  const currentStep = currentTutorialSteps[tutorialStep];

  // Tutorial functions
  const startTutorial = (mode: 'beginner' | 'advanced') => {
    setTutorialMode(mode);
    setTutorialStep(0);
    setShowTutorial(true);
    setIsEditing(true);
    // Reset form for tutorial
    setAppForm({
      name: mode === 'beginner' ? "My First Agent App" : "Advanced Agent Workflow",
      description: mode === 'beginner' ? "Learning the basics" : "Advanced orchestration patterns",
      category: "travel",
      flowDefinition: [],
      inputSchema: { type: "object", properties: {} },
      outputSchema: { type: "object", properties: {} },
      guardrails: []
    });
    setConnections([]);
    setSelectedNode(null);
  };

  const nextTutorialStep = () => {
    if (tutorialStep < currentTutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      completeTutorial();
    }
  };

  const previousTutorialStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const skipTutorial = () => {
    setShowTutorial(false);
    setTutorialMode(null);
    setTutorialStep(0);
    setHighlightElement(null);
  };

  const completeTutorial = () => {
    setShowTutorial(false);
    setTutorialMode(null);
    setTutorialStep(0);
    setHighlightElement(null);
    toast({ 
      title: "Tutorial Completed!", 
      description: "You've mastered agent workflow creation. Start building amazing apps!" 
    });
  };

  // Auto-advance tutorial based on validation
  useEffect(() => {
    if (showTutorial && currentStep?.validation && currentStep.validation()) {
      const timer = setTimeout(() => {
        nextTutorialStep();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showTutorial, currentStep, appForm.flowDefinition, connections, isRunning, executionData]);

  // Set highlight elements
  useEffect(() => {
    if (showTutorial && currentStep) {
      setHighlightElement(currentStep.target);
    }
  }, [showTutorial, currentStep]);

  // Connection drawing for tutorial
  const startConnection = (nodeId: string, port: string, x: number, y: number) => {
    setConnectorDrawing({ from: nodeId, fromPort: port, x, y });
  };

  const updateConnectionPosition = (x: number, y: number) => {
    if (connectorDrawing) {
      setConnectorDrawing(prev => prev ? { ...prev, x, y } : null);
    }
  };

  const finishConnection = (toNodeId: string, toPort: string) => {
    if (connectorDrawing) {
      const newConnection: Connection = {
        id: `${connectorDrawing.from}-${toNodeId}-${Date.now()}`,
        from: connectorDrawing.from,
        to: toNodeId,
        fromPort: connectorDrawing.fromPort,
        toPort: toPort
      };
      setConnections(prev => [...prev, newConnection]);
      setConnectorDrawing(null);
    }
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
        
        <div className="border-t pt-3 mt-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => startTutorial('beginner')}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              Beginner Tutorial
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => startTutorial('advanced')}
            >
              <Target className="w-3 h-3 mr-1" />
              Advanced Tutorial
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TutorialOverlay = () => {
    if (!showTutorial || !currentStep) return null;

    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        
        {/* Tutorial content */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <Card className="w-96 max-w-[90vw]">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                  <CardDescription>{currentStep.description}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTutorial}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Progress 
                value={((tutorialStep + 1) / currentTutorialSteps.length) * 100} 
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground">
                Step {tutorialStep + 1} of {currentTutorialSteps.length}
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{currentStep.content}</p>
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={previousTutorialStep}
                  disabled={tutorialStep === 0}
                >
                  <ArrowUp className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={skipTutorial}
                  >
                    <SkipForward className="w-4 h-4 mr-1" />
                    Skip Tutorial
                  </Button>
                  
                  {currentStep.validation ? (
                    <Button
                      variant={currentStep.validation() ? "default" : "outline"}
                      onClick={nextTutorialStep}
                      disabled={!currentStep.validation()}
                    >
                      {currentStep.validation() ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Continue
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 mr-1" />
                          {currentStep.action}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={nextTutorialStep}>
                      <ArrowDown className="w-4 h-4 mr-1" />
                      {tutorialStep === currentTutorialSteps.length - 1 ? 'Complete' : 'Next'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

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
                    id="add-component-btn"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowComponentSelector(true)}
                    className={highlightElement === 'add-component-btn' ? 'ring-2 ring-blue-400 ring-opacity-75 animate-pulse' : ''}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Add Component</span>
                  </Button>
                  <Button
                    id="test-btn"
                    variant={isRunning ? "destructive" : "default"}
                    size="sm"
                    onClick={startExecution}
                    disabled={appForm.flowDefinition.length === 0}
                    className={highlightElement === 'test-btn' ? 'ring-2 ring-blue-400 ring-opacity-75 animate-pulse' : ''}
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
                    id="save-btn"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectedApp ? 
                        updateApp.mutate({ id: selectedApp, ...appForm }) : 
                        createApp.mutate(appForm);
                    }}
                    disabled={createApp.isPending || updateApp.isPending}
                    className={highlightElement === 'save-btn' ? 'ring-2 ring-blue-400 ring-opacity-75 animate-pulse' : ''}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative overflow-hidden">
                <div 
                  id="canvas"
                  ref={canvasRef}
                  className={`absolute inset-0 bg-gray-50 overflow-auto ${highlightElement === 'canvas' ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}
                  style={{
                    backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
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
                    
                    {/* Render connector being drawn */}
                    {connectorDrawing && (
                      <g>
                        <path
                          d={`M ${connectorDrawing.x} ${connectorDrawing.y} L ${connectorDrawing.x} ${connectorDrawing.y}`}
                          stroke="#6366f1"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray="5,5"
                        />
                        <circle
                          cx={connectorDrawing.x}
                          cy={connectorDrawing.y}
                          r="4"
                          fill="#6366f1"
                          opacity="0.7"
                        />
                      </g>
                    )}
                    
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

      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Agent Chaining Guide
                <Badge variant="secondary" className="ml-auto">
                  {tutorialStep + 1} / {TUTORIAL_STEPS.length}
                </Badge>
              </CardTitle>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((tutorialStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg mb-2 text-blue-600">
                  {TUTORIAL_STEPS[tutorialStep].title}
                </h4>
                <p className="text-gray-700 leading-relaxed">
                  {TUTORIAL_STEPS[tutorialStep].description}
                </p>
              </div>
              
              {TUTORIAL_STEPS[tutorialStep].actionRequired && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Action Required</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    {TUTORIAL_STEPS[tutorialStep].actionRequired}
                  </p>
                </div>
              )}

              {TUTORIAL_STEPS[tutorialStep].tip && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Lightbulb className="w-4 h-4" />
                    <span className="font-medium">Pro Tip</span>
                  </div>
                  <p className="text-sm text-amber-600 mt-1">
                    {TUTORIAL_STEPS[tutorialStep].tip}
                  </p>
                </div>
              )}
              
              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => tutorialStep > 0 && setTutorialStep(tutorialStep - 1)}
                    disabled={tutorialStep === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowTutorial(false);
                      setHighlightElement(null);
                    }}
                  >
                    Skip Tutorial
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
                      setTutorialStep(tutorialStep + 1);
                      if (TUTORIAL_STEPS[tutorialStep + 1].highlight) {
                        setHighlightElement(TUTORIAL_STEPS[tutorialStep + 1].highlight!);
                      }
                    } else {
                      setShowTutorial(false);
                      setHighlightElement(null);
                    }
                  }}
                >
                  {tutorialStep === TUTORIAL_STEPS.length - 1 ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}