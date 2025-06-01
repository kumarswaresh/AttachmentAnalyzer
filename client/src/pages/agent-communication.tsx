import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Send, 
  Chain, 
  Play, 
  Pause, 
  BarChart3, 
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  GitBranch,
  Activity
} from "lucide-react";
import type { Agent } from "@shared/schema";

interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  messageType: string;
  content: any;
  status: string;
  priority: number;
  timestamp: string;
  processedAt?: string;
}

interface ChainStep {
  id: string;
  name: string;
  agentId: string;
  condition?: any;
  inputMapping?: Record<string, any>;
  outputMapping?: Record<string, any>;
  timeout?: number;
  retryCount?: number;
}

interface AgentChain {
  id: string;
  name: string;
  description?: string;
  steps: ChainStep[];
  createdAt: string;
  isActive: boolean;
}

interface ChainExecution {
  id: string;
  chainId: string;
  status: string;
  currentStep: number;
  input: any;
  output: any;
  startedAt: string;
  endedAt?: string;
}

export default function AgentCommunication() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [newMessage, setNewMessage] = useState({
    toAgentId: "",
    messageType: "task",
    content: "",
    priority: 1
  });
  const [newChain, setNewChain] = useState({
    name: "",
    description: "",
    steps: [] as ChainStep[]
  });
  const [executionInput, setExecutionInput] = useState("{}");

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
  });

  // Fetch agent chains
  const { data: chains = [] } = useQuery({
    queryKey: ["/api/agent-chains"],
  });

  // Fetch messages for selected agent
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/agents", selectedAgent, "messages"],
    enabled: !!selectedAgent
  });

  // Fetch chain executions for selected chain
  const { data: executions = [] } = useQuery({
    queryKey: ["/api/agent-chains", selectedChain, "executions"],
    enabled: !!selectedChain
  });

  // Fetch communication stats
  const { data: commStats } = useQuery({
    queryKey: ["/api/agents", selectedAgent, "communication-stats"],
    enabled: !!selectedAgent
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await fetch("/api/agent-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAgentId: selectedAgent,
          ...messageData,
          content: JSON.parse(messageData.content || "{}")
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Agent message sent successfully"
      });
      setNewMessage({ toAgentId: "", messageType: "task", content: "", priority: 1 });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", selectedAgent, "messages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  });

  // Create chain mutation
  const createChain = useMutation({
    mutationFn: async (chainData: any) => {
      const response = await fetch("/api/agent-chains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chainData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to create chain");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Chain Created",
        description: "Agent chain created successfully"
      });
      setNewChain({ name: "", description: "", steps: [] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-chains"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create chain: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  });

  // Execute chain mutation
  const executeChain = useMutation({
    mutationFn: async ({ chainId, input }: { chainId: string; input: any }) => {
      const response = await fetch(`/api/agent-chains/${chainId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
      });
      
      if (!response.ok) {
        throw new Error("Failed to execute chain");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Chain Execution Started",
        description: "Agent chain execution initiated"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-chains", selectedChain, "executions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to execute chain: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !newMessage.toAgentId || !newMessage.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    sendMessage.mutate(newMessage);
  };

  const handleCreateChain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChain.name || newChain.steps.length === 0) {
      toast({
        title: "Validation Error",
        description: "Chain must have a name and at least one step",
        variant: "destructive"
      });
      return;
    }
    createChain.mutate(newChain);
  };

  const handleExecuteChain = () => {
    if (!selectedChain) return;
    
    try {
      const input = JSON.parse(executionInput);
      executeChain.mutate({ chainId: selectedChain, input });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON for execution input",
        variant: "destructive"
      });
    }
  };

  const addChainStep = () => {
    const newStep: ChainStep = {
      id: `step_${Date.now()}`,
      name: `Step ${newChain.steps.length + 1}`,
      agentId: "",
      timeout: 30000,
      retryCount: 1
    };
    setNewChain(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const updateChainStep = (index: number, updates: Partial<ChainStep>) => {
    setNewChain(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? { ...step, ...updates } : step)
    }));
  };

  const removeChainStep = (index: number) => {
    setNewChain(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a: Agent) => a.id === agentId);
    return agent?.name || agentId;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agent Communication & Chaining</h1>
          <p className="text-muted-foreground">
            Manage agent-to-agent communication and create execution chains
          </p>
        </div>
      </div>

      <Tabs defaultValue="communication" className="space-y-4">
        <TabsList>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="chains">Agent Chains</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send Message */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Message
                </CardTitle>
                <CardDescription>
                  Send a message from one agent to another
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <Label htmlFor="fromAgent">From Agent</Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent: Agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="toAgent">To Agent</Label>
                    <Select 
                      value={newMessage.toAgentId} 
                      onValueChange={(value) => setNewMessage(prev => ({ ...prev, toAgentId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent: Agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="messageType">Message Type</Label>
                    <Select 
                      value={newMessage.messageType} 
                      onValueChange={(value) => setNewMessage(prev => ({ ...prev, messageType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="result">Result</SelectItem>
                        <SelectItem value="handoff">Handoff</SelectItem>
                        <SelectItem value="context">Context</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="content">Message Content (JSON)</Label>
                    <Textarea
                      id="content"
                      placeholder='{"action": "analyze", "data": "..."}'
                      value={newMessage.content}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={newMessage.priority.toString()} 
                      onValueChange={(value) => setNewMessage(prev => ({ ...prev, priority: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Low (1)</SelectItem>
                        <SelectItem value="2">Normal (2)</SelectItem>
                        <SelectItem value="3">High (3)</SelectItem>
                        <SelectItem value="4">Urgent (4)</SelectItem>
                        <SelectItem value="5">Critical (5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={sendMessage.isPending}
                    className="w-full"
                  >
                    {sendMessage.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Message History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Message History
                </CardTitle>
                <CardDescription>
                  Recent messages for selected agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAgent ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {messages.length > 0 ? messages.map((message: AgentMessage) => (
                      <div key={message.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{message.messageType}</Badge>
                            <Badge variant={message.status === 'processed' ? 'default' : 'secondary'}>
                              {message.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Priority: {message.priority}
                          </span>
                        </div>
                        <div className="text-sm mb-2">
                          <strong>From:</strong> {getAgentName(message.fromAgentId)} →{" "}
                          <strong>To:</strong> {getAgentName(message.toAgentId)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {new Date(message.timestamp).toLocaleString()}
                        </div>
                        <div className="text-sm bg-gray-50 rounded p-2">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(message.content, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No messages found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select an agent to view messages</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agent Chains Tab */}
        <TabsContent value="chains" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Chain */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Chain className="w-5 h-5" />
                  Create Agent Chain
                </CardTitle>
                <CardDescription>
                  Build a sequence of agent executions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateChain} className="space-y-4">
                  <div>
                    <Label htmlFor="chainName">Chain Name</Label>
                    <Input
                      id="chainName"
                      value={newChain.name}
                      onChange={(e) => setNewChain(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter chain name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="chainDescription">Description</Label>
                    <Textarea
                      id="chainDescription"
                      value={newChain.description}
                      onChange={(e) => setNewChain(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this chain does"
                      rows={2}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <Label>Chain Steps</Label>
                      <Button type="button" onClick={addChainStep} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Step
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {newChain.steps.map((step, index) => (
                        <div key={step.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Step {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeChainStep(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Step Name</Label>
                              <Input
                                value={step.name}
                                onChange={(e) => updateChainStep(index, { name: e.target.value })}
                                placeholder="Step name"
                                size="sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Agent</Label>
                              <Select 
                                value={step.agentId} 
                                onValueChange={(value) => updateChainStep(index, { agentId: value })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select agent" />
                                </SelectTrigger>
                                <SelectContent>
                                  {agents.map((agent: Agent) => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                      {agent.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createChain.isPending}
                    className="w-full"
                  >
                    {createChain.isPending ? "Creating..." : "Create Chain"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Execute Chain */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Execute Chain
                </CardTitle>
                <CardDescription>
                  Run an agent chain with custom input
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="chainSelect">Select Chain</Label>
                    <Select value={selectedChain} onValueChange={setSelectedChain}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chain to execute" />
                      </SelectTrigger>
                      <SelectContent>
                        {chains.map((chain: AgentChain) => (
                          <SelectItem key={chain.id} value={chain.id}>
                            {chain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="executionInput">Input Data (JSON)</Label>
                    <Textarea
                      id="executionInput"
                      value={executionInput}
                      onChange={(e) => setExecutionInput(e.target.value)}
                      placeholder='{"data": "input for chain execution"}'
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleExecuteChain}
                    disabled={!selectedChain || executeChain.isPending}
                    className="w-full"
                  >
                    {executeChain.isPending ? "Executing..." : "Execute Chain"}
                  </Button>

                  {/* Recent Executions */}
                  {selectedChain && executions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Recent Executions</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {executions.map((execution: ChainExecution) => (
                          <div key={execution.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(execution.status)}
                              <span className="text-sm">
                                Step {execution.currentStep + 1}
                              </span>
                              <Badge variant="outline">{execution.status}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(execution.startedAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Existing Chains */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Existing Chains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {chains.length > 0 ? chains.map((chain: AgentChain) => (
                  <Card key={chain.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{chain.name}</h3>
                          {chain.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {chain.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {chain.steps?.length || 0} steps • Created {new Date(chain.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Chain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No chains created yet</p>
                    <p className="text-sm">Create your first agent chain to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Communication Stats */}
            {commStats && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Total Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{commStats.totalMessages}</div>
                    <p className="text-sm text-muted-foreground">
                      Across all message types
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Processing Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {Math.round(commStats.averageProcessingTime / 1000)}s
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Average processing time
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Error Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {commStats.errorRate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Message failure rate
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Message Type Distribution */}
          {commStats && (
            <Card>
              <CardHeader>
                <CardTitle>Message Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(commStats.messagesByType || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="capitalize">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(count as number / commStats.totalMessages) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}