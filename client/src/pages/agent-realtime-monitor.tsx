import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, Play, Pause, Square, Zap, Clock, Database, 
  MapPin, TrendingUp, ThermometerSun, CreditCard, BarChart3,
  CheckCircle, AlertTriangle, XCircle, Loader2, ArrowRight,
  Cpu, HardDrive, Network, Eye, Settings
} from "lucide-react";

interface ProcessingNode {
  id: string;
  name: string;
  type: 'agent' | 'connector' | 'memory' | 'transform' | 'condition';
  status: 'idle' | 'processing' | 'completed' | 'error' | 'waiting';
  progress: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  metadata: {
    tokensUsed?: number;
    apiCalls?: number;
    memoryAccess?: number;
    cost?: number;
  };
}

interface DataFlow {
  from: string;
  to: string;
  data: any;
  timestamp: string;
  size: number;
  type: string;
}

interface ExecutionSession {
  id: string;
  appId: string;
  appName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'error' | 'paused';
  nodes: ProcessingNode[];
  dataFlows: DataFlow[];
  totalCost: number;
  totalTokens: number;
  performance: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export default function AgentRealtimeMonitor() {
  const [selectedSession, setSelectedSession] = useState<string>("session-1");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState("live");
  const wsRef = useRef<WebSocket | null>(null);

  // Mock real-time execution session for demonstration
  const [executionSession, setExecutionSession] = useState<ExecutionSession>({
    id: "session-1",
    appId: "location-aware-concierge",
    appName: "Location-Aware Concierge",
    startTime: new Date().toISOString(),
    status: 'running',
    totalCost: 0.23,
    totalTokens: 1450,
    performance: {
      cpu: 65,
      memory: 78,
      network: 42
    },
    nodes: [
      {
        id: "input-parser",
        name: "Input Parser",
        type: "transform",
        status: "completed",
        progress: 100,
        startTime: new Date(Date.now() - 5000).toISOString(),
        endTime: new Date(Date.now() - 4500).toISOString(),
        duration: 500,
        metadata: { tokensUsed: 45, apiCalls: 1, cost: 0.002 }
      },
      {
        id: "geospatial-analysis",
        name: "Geospatial Analysis",
        type: "connector",
        status: "processing",
        progress: 75,
        startTime: new Date(Date.now() - 3000).toISOString(),
        metadata: { tokensUsed: 120, apiCalls: 3, cost: 0.015 }
      },
      {
        id: "weather-data",
        name: "Weather Intelligence",
        type: "connector",
        status: "processing",
        progress: 60,
        startTime: new Date(Date.now() - 2500).toISOString(),
        metadata: { tokensUsed: 80, apiCalls: 2, cost: 0.008 }
      },
      {
        id: "event-discovery",
        name: "Event Discovery",
        type: "connector",
        status: "waiting",
        progress: 0,
        metadata: { tokensUsed: 0, apiCalls: 0, cost: 0 }
      },
      {
        id: "recommendation-engine",
        name: "Recommendation Engine",
        type: "agent",
        status: "waiting",
        progress: 0,
        metadata: { tokensUsed: 0, apiCalls: 0, cost: 0 }
      },
      {
        id: "response-formatter",
        name: "Response Formatter",
        type: "transform",
        status: "idle",
        progress: 0,
        metadata: { tokensUsed: 0, apiCalls: 0, cost: 0 }
      }
    ],
    dataFlows: [
      {
        from: "input-parser",
        to: "geospatial-analysis",
        data: { location: "San Francisco, CA", query: "best restaurants near me" },
        timestamp: new Date(Date.now() - 4000).toISOString(),
        size: 245,
        type: "location_query"
      },
      {
        from: "input-parser",
        to: "weather-data",
        data: { coordinates: [37.7749, -122.4194] },
        timestamp: new Date(Date.now() - 3500).toISOString(),
        size: 128,
        type: "coordinates"
      }
    ]
  });

  // Simulate real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setExecutionSession(prev => {
        const updated = { ...prev };
        
        // Update processing nodes
        updated.nodes = prev.nodes.map(node => {
          if (node.status === 'processing' && node.progress < 100) {
            const newProgress = Math.min(100, node.progress + Math.random() * 15);
            return {
              ...node,
              progress: newProgress,
              metadata: {
                ...node.metadata,
                tokensUsed: node.metadata.tokensUsed! + Math.floor(Math.random() * 10),
                cost: node.metadata.cost! + Math.random() * 0.005
              }
            };
          }
          if (node.status === 'waiting' && Math.random() > 0.7) {
            return {
              ...node,
              status: 'processing' as const,
              progress: 5,
              startTime: new Date().toISOString()
            };
          }
          return node;
        });

        // Update performance metrics
        updated.performance = {
          cpu: Math.max(30, Math.min(90, prev.performance.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(40, Math.min(95, prev.performance.memory + (Math.random() - 0.5) * 8)),
          network: Math.max(10, Math.min(80, prev.performance.network + (Math.random() - 0.5) * 15))
        };

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'waiting': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case 'agent': return <Zap className="w-5 h-5" />;
      case 'connector': return <Database className="w-5 h-5" />;
      case 'memory': return <HardDrive className="w-5 h-5" />;
      case 'transform': return <Settings className="w-5 h-5" />;
      case 'condition': return <BarChart3 className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-time Agent Monitor</h1>
          <p className="text-gray-600 mt-2">
            Live visualization of agent processing and data flow
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="session-1">Location Concierge - Running</SelectItem>
              <SelectItem value="session-2">Event Marketing - Completed</SelectItem>
              <SelectItem value="session-3">Financial Advisor - Error</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {autoRefresh ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>

      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(executionSession.status)}>
                {executionSession.status}
              </Badge>
              <span className="text-2xl font-bold">
                {executionSession.nodes.filter(n => n.status === 'completed').length}/
                {executionSession.nodes.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Nodes Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${executionSession.totalCost.toFixed(3)}</div>
            <p className="text-xs text-gray-500 mt-1">{executionSession.totalTokens} tokens used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor((Date.now() - new Date(executionSession.startTime).getTime()) / 1000)}s
            </div>
            <p className="text-xs text-gray-500 mt-1">Running time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3" />
                <Progress value={executionSession.performance.cpu} className="flex-1 h-2" />
                <span className="text-xs">{executionSession.performance.cpu}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Memory className="w-3 h-3" />
                <Progress value={executionSession.performance.memory} className="flex-1 h-2" />
                <span className="text-xs">{executionSession.performance.memory}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live">Live Processing</TabsTrigger>
          <TabsTrigger value="flow">Data Flow</TabsTrigger>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          {/* Processing Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Pipeline</CardTitle>
              <CardDescription>Real-time status of each processing node</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executionSession.nodes.map((node, index) => (
                  <div key={node.id} className="relative">
                    {index > 0 && (
                      <div className="absolute left-6 -top-4 w-0.5 h-4 bg-gray-200"></div>
                    )}
                    
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getNodeTypeIcon(node.type)}
                        <div>
                          <div className="font-medium">{node.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{node.type}</div>
                        </div>
                      </div>

                      <div className="flex-1 mx-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(node.status)}
                          <Badge className={getStatusColor(node.status)} variant="outline">
                            {node.status}
                          </Badge>
                          {node.duration && (
                            <span className="text-xs text-gray-500">
                              {node.duration}ms
                            </span>
                          )}
                        </div>
                        {node.status === 'processing' && (
                          <Progress value={node.progress} className="h-2" />
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-sm font-medium">
                          {node.metadata.tokensUsed} tokens
                        </div>
                        <div className="text-xs text-gray-500">
                          ${node.metadata.cost?.toFixed(4)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {node.metadata.apiCalls} API calls
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="space-y-6">
          {/* Data Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Data Flow Visualization</CardTitle>
              <CardDescription>Real-time data transfer between processing nodes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executionSession.dataFlows.map((flow, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{flow.from}</Badge>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <Badge variant="outline">{flow.to}</Badge>
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-sm font-medium">{flow.type}</div>
                      <div className="text-xs text-gray-500">
                        {flow.size} bytes • {new Date(flow.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      Inspect
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Runtime Cost Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Runtime Cost Tracking
              </CardTitle>
              <CardDescription>Real-time cost analysis for agent app execution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">$0.0042</div>
                  <div className="text-sm text-gray-600">Current Session</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">1,247</div>
                  <div className="text-sm text-gray-600">Tokens Used</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">$0.18</div>
                  <div className="text-sm text-gray-600">Daily Total</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Location-Aware Concierge</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">$0.0028</div>
                    <div className="text-xs text-gray-500">847 tokens</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">Event Marketing Optimizer</span>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">$0.0014</div>
                    <div className="text-xs text-gray-500">400 tokens</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Execution Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>Detailed execution history and cost breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-500">15:08:43</span>
                  <span className="text-green-600">[INFO]</span>
                  <span>Input Parser completed successfully</span>
                  <span className="text-xs text-green-600 ml-auto">$0.0001</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500">15:08:44</span>
                  <span className="text-blue-600">[DEBUG]</span>
                  <span>Geospatial Analysis started with coordinates [37.7749, -122.4194]</span>
                  <span className="text-xs text-green-600 ml-auto">$0.0008</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500">15:08:45</span>
                  <span className="text-blue-600">[DEBUG]</span>
                  <span>Weather Intelligence API call initiated</span>
                  <span className="text-xs text-green-600 ml-auto">$0.0003</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500">15:08:46</span>
                  <span className="text-green-600">[INFO]</span>
                  <span>Geospatial Analysis: Found 15 nearby restaurants</span>
                  <span className="text-xs text-green-600 ml-auto">$0.0012</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500">15:08:47</span>
                  <span className="text-green-600">[INFO]</span>
                  <span>Weather Intelligence: Current temperature 72°F, partly cloudy</span>
                  <span className="text-xs text-green-600 ml-auto">$0.0006</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500">15:08:48</span>
                  <span className="text-blue-600">[DEBUG]</span>
                  <span>Event Discovery queued for execution</span>
                  <span className="text-xs text-green-600 ml-auto">$0.0004</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500">15:08:49</span>
                  <span className="text-orange-600">[COST]</span>
                  <span>Session total: $0.0042 • Tokens: 1,247 • Rate: $0.000003/token</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}