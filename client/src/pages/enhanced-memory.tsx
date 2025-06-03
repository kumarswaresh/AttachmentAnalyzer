import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, TrendingUp, MessageSquare, Clock, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Memory {
  id: number;
  question: string;
  answer: string;
  importanceScore: number;
  memoryType: string;
  contextMetadata: Record<string, any>;
  createdAt: Date;
}

interface MemoryEvolution {
  id: number;
  memoryId: number;
  evolutionType: string;
  feedbackSource: string;
  previousScore: number;
  newScore: number;
  timestamp: Date;
}

export default function EnhancedMemoryPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [memoryType, setMemoryType] = useState<string>("all");
  const [minImportance, setMinImportance] = useState<number>(0);
  const [feedbackScore, setFeedbackScore] = useState<number>(0);
  const [selectedMemoryId, setSelectedMemoryId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"]
  });

  // Fetch memories with context filtering
  const { data: memories = [], isLoading: memoriesLoading } = useQuery({
    queryKey: ["/api/memory", selectedAgent, "context", { memoryType, minImportance }],
    enabled: !!selectedAgent,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (memoryType !== "all") params.append("memoryType", memoryType);
      if (minImportance > 0) params.append("minImportance", minImportance.toString());
      
      return apiRequest("GET", `/api/memory/${selectedAgent}/context?${params}`);
    }
  });

  // Fetch memory evolution
  const { data: evolution = [] } = useQuery({
    queryKey: ["/api/memory", selectedAgent, "evolution"],
    enabled: !!selectedAgent,
    queryFn: () => apiRequest("GET", `/api/memory/${selectedAgent}/evolution`)
  });

  // Memory feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async (data: {
      memoryId: number;
      feedbackScore: number;
      feedbackSource: string;
      feedbackData: Record<string, any>;
    }) => {
      return apiRequest("POST", "/api/memory/feedback", data);
    },
    onSuccess: () => {
      toast({
        title: "Feedback Added",
        description: "Memory feedback has been successfully recorded"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
      setSelectedMemoryId(null);
      setFeedbackScore(0);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add memory feedback",
        variant: "destructive"
      });
    }
  });

  const handleFeedback = (memoryId: number, score: number, type: 'positive' | 'negative') => {
    feedbackMutation.mutate({
      memoryId,
      feedbackScore: score,
      feedbackSource: 'user',
      feedbackData: {
        feedbackType: type,
        timestamp: new Date().toISOString()
      }
    });
  };

  const getMemoryTypeColor = (type: string) => {
    const colors = {
      input: "bg-blue-100 text-blue-800",
      output: "bg-green-100 text-green-800",
      feedback: "bg-orange-100 text-orange-800",
      general: "bg-gray-100 text-gray-800"
    };
    return colors[type as keyof typeof colors] || colors.general;
  };

  const getEvolutionTypeColor = (type: string) => {
    const colors = {
      reinforcement: "bg-green-100 text-green-800",
      correction: "bg-red-100 text-red-800",
      enhancement: "bg-blue-100 text-blue-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Enhanced Agent Memory</h1>
          <p className="text-muted-foreground">
            Advanced memory management with feedback learning and evolution tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{memories.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Memories</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{evolution.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Evolution Events</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold">
                {memories.length > 0 
                  ? (memories.reduce((sum: number, m: Memory) => sum + m.importanceScore, 0) / memories.length).toFixed(2)
                  : "0.00"
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Avg Importance</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">
                {memories.filter((m: Memory) => m.importanceScore > 0.7).length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Memory Management</CardTitle>
              <CardDescription>
                Filter and manage agent memories with advanced context search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-select">Select Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
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
                
                <div className="space-y-2">
                  <Label htmlFor="memory-type">Memory Type</Label>
                  <Select value={memoryType} onValueChange={setMemoryType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="input">Input</SelectItem>
                      <SelectItem value="output">Output</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min-importance">Min Importance: {minImportance}</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={minImportance}
                    onChange={(e) => setMinImportance(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {selectedAgent && (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {memoriesLoading ? (
                      <p className="text-center text-muted-foreground">Loading memories...</p>
                    ) : memories.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        No memories found for the selected criteria
                      </p>
                    ) : (
                      memories.map((memory: Memory) => (
                        <Card key={memory.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge className={getMemoryTypeColor(memory.memoryType)}>
                                {memory.memoryType}
                              </Badge>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">
                                  Importance: {memory.importanceScore.toFixed(2)}
                                </span>
                                <Progress value={memory.importanceScore * 100} className="w-16" />
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{memory.question}</p>
                              <p className="text-sm text-muted-foreground">{memory.answer}</p>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(memory.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFeedback(memory.id, 0.2, 'positive')}
                                  disabled={feedbackMutation.isPending}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFeedback(memory.id, -0.2, 'negative')}
                                  disabled={feedbackMutation.isPending}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Memory Evolution</CardTitle>
              <CardDescription>
                Track how memories evolve based on feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedAgent ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {evolution.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        No evolution events recorded
                      </p>
                    ) : (
                      evolution.map((event: MemoryEvolution) => (
                        <div key={event.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={getEvolutionTypeColor(event.evolutionType)}>
                              {event.evolutionType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {event.feedbackSource}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Previous: {event.previousScore.toFixed(2)}</span>
                              <span>New: {event.newScore.toFixed(2)}</span>
                            </div>
                            <Progress 
                              value={(event.newScore - event.previousScore + 1) * 50} 
                              className="h-2"
                            />
                          </div>
                          
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-center text-muted-foreground">
                  Select an agent to view memory evolution
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}