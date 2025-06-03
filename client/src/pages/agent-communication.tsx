import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Users, 
  Settings, 
  Send, 
  Network, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause
} from "lucide-react";

const messageFormSchema = z.object({
  fromAgentId: z.string().optional(),
  toAgentId: z.string().min(1, "Target agent is required"),
  messageType: z.enum(["task", "result", "error", "context", "data_share", "coordination"]),
  subject: z.string().optional(),
  body: z.string().min(1, "Message body is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  responseRequired: z.boolean().default(false),
  responseTimeout: z.number().optional()
});

const channelFormSchema = z.object({
  name: z.string().min(1, "Channel name is required"),
  channelType: z.enum(["broadcast", "group", "direct", "workflow"]),
  participantAgents: z.array(z.string()).min(1, "At least one participant is required"),
  moderatorAgent: z.string().optional(),
  description: z.string().optional()
});

const coordinationRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["message_received", "agent_status_change", "time_based", "condition_met", "error_occurred"]),
  actionType: z.enum(["send_message", "notify_agents", "trigger_workflow", "escalate", "retry", "pause_execution"]),
  priority: z.number().min(1).max(10).default(1),
  targetAgents: z.array(z.string()).optional()
});

export default function AgentCommunication() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"],
  });

  // Fetch agent messages
  const { data: messagesData } = useQuery({
    queryKey: ["/api/agent-communication/agents", selectedAgentId, "messages"],
    enabled: !!selectedAgentId,
  });

  // Fetch communication channels
  const { data: channels = [] } = useQuery({
    queryKey: ["/api/agent-communication/channels"],
  });

  // Fetch coordination rules
  const { data: rules = [] } = useQuery({
    queryKey: ["/api/agent-communication/coordination-rules"],
  });

  // Fetch communication statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/agent-communication/stats"],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/agent-communication/send", data),
    onSuccess: () => {
      toast({ title: "Message sent successfully" });
      setMessageDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-communication"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/agent-communication/channels", data),
    onSuccess: () => {
      toast({ title: "Communication channel created successfully" });
      setChannelDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-communication/channels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create channel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create coordination rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/agent-communication/coordination-rules", data),
    onSuccess: () => {
      toast({ title: "Coordination rule created successfully" });
      setRuleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/agent-communication/coordination-rules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create coordination rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Acknowledge message mutation
  const acknowledgeMutation = useMutation({
    mutationFn: ({ messageId, response }: { messageId: string; response?: any }) =>
      apiRequest("POST", `/api/agent-communication/messages/${messageId}/acknowledge`, { response }),
    onSuccess: () => {
      toast({ title: "Message acknowledged" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-communication"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to acknowledge message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const messageForm = useForm<z.infer<typeof messageFormSchema>>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      priority: "medium",
      responseRequired: false,
    },
  });

  const channelForm = useForm<z.infer<typeof channelFormSchema>>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      channelType: "group",
    },
  });

  const ruleForm = useForm<z.infer<typeof coordinationRuleSchema>>({
    resolver: zodResolver(coordinationRuleSchema),
    defaultValues: {
      priority: 1,
    },
  });

  const onSendMessage = (data: z.infer<typeof messageFormSchema>) => {
    const content = {
      subject: data.subject,
      body: data.body,
      data: {},
      expectedResponse: data.responseRequired ? "acknowledgment" : "none",
    };

    sendMessageMutation.mutate({
      ...data,
      content,
    });
  };

  const onCreateChannel = (data: z.infer<typeof channelFormSchema>) => {
    createChannelMutation.mutate({
      ...data,
      configuration: {
        description: data.description,
        maxParticipants: data.participantAgents.length,
      },
    });
  };

  const onCreateRule = (data: z.infer<typeof coordinationRuleSchema>) => {
    const triggerConditions = [{
      type: data.triggerType,
      conditions: {},
      agentFilters: data.targetAgents || [],
    }];

    const actions = [{
      type: data.actionType,
      parameters: {},
      targetAgents: data.targetAgents || [],
    }];

    createRuleMutation.mutate({
      ...data,
      triggerConditions,
      actions,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processed": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Communication</h1>
          <p className="text-gray-600">Manage agent-to-agent messaging and coordination</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Send Agent Message</DialogTitle>
              </DialogHeader>
              <Form {...messageForm}>
                <form onSubmit={messageForm.handleSubmit(onSendMessage)} className="space-y-4">
                  <FormField
                    control={messageForm.control}
                    name="fromAgentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Agent (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agents.map((agent: any) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={messageForm.control}
                    name="toAgentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Agent *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select target agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agents.map((agent: any) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={messageForm.control}
                    name="messageType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select message type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="result">Result</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                            <SelectItem value="context">Context</SelectItem>
                            <SelectItem value="data_share">Data Share</SelectItem>
                            <SelectItem value="coordination">Coordination</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={messageForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Message subject" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={messageForm.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Body *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter your message..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={messageForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setMessageDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sendMessageMutation.isPending}>
                      {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Communication Channel</DialogTitle>
              </DialogHeader>
              <Form {...channelForm}>
                <form onSubmit={channelForm.handleSubmit(onCreateChannel)} className="space-y-4">
                  <FormField
                    control={channelForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter channel name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={channelForm.control}
                    name="channelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="broadcast">Broadcast</SelectItem>
                            <SelectItem value="group">Group</SelectItem>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="workflow">Workflow</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setChannelDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createChannelMutation.isPending}>
                      {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="rules">Coordination Rules</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={setSelectedAgentId} value={selectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent to view messages" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Agent Messages
                  {messagesData && (
                    <Badge variant="secondary">
                      {messagesData.totalCount} total, {messagesData.unreadCount} unread
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedAgentId ? (
                  <div className="text-center py-8 text-gray-500">
                    Select an agent to view their messages
                  </div>
                ) : messagesData?.messages?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No messages found for this agent
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messagesData?.messages?.map((message: any) => (
                      <div key={message.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(message.status)}>
                              {message.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                              {message.status === "processed" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {message.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                              {message.status}
                            </Badge>
                            <Badge className={getPriorityColor(message.priority)}>
                              {message.priority}
                            </Badge>
                            <Badge variant="outline">{message.messageType}</Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(message.timestamp).toLocaleString()}
                          </div>
                        </div>
                        
                        {message.content?.subject && (
                          <div className="font-medium">{message.content.subject}</div>
                        )}
                        
                        <div className="text-sm text-gray-700">
                          {message.content?.body}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          From: {message.fromAgentId || "System"}
                        </div>
                        
                        {message.status === "pending" && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => acknowledgeMutation.mutate({ messageId: message.id })}
                              disabled={acknowledgeMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Acknowledge
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel: any) => (
              <Card key={channel.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{channel.name}</span>
                    <Badge variant="outline">{channel.channelType}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      Participants: {channel.participantAgents?.length || 0}
                    </div>
                    {channel.moderatorAgent && (
                      <div className="text-sm text-gray-600">
                        Moderator: {channel.moderatorAgent}
                      </div>
                    )}
                    <div className="flex justify-end gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Coordination Rule</DialogTitle>
                </DialogHeader>
                <Form {...ruleForm}>
                  <form onSubmit={ruleForm.handleSubmit(onCreateRule)} className="space-y-4">
                    <FormField
                      control={ruleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rule Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter rule name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ruleForm.control}
                      name="triggerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select trigger type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="message_received">Message Received</SelectItem>
                              <SelectItem value="agent_status_change">Agent Status Change</SelectItem>
                              <SelectItem value="time_based">Time Based</SelectItem>
                              <SelectItem value="condition_met">Condition Met</SelectItem>
                              <SelectItem value="error_occurred">Error Occurred</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ruleForm.control}
                      name="actionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Action Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select action type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="send_message">Send Message</SelectItem>
                              <SelectItem value="notify_agents">Notify Agents</SelectItem>
                              <SelectItem value="trigger_workflow">Trigger Workflow</SelectItem>
                              <SelectItem value="escalate">Escalate</SelectItem>
                              <SelectItem value="retry">Retry</SelectItem>
                              <SelectItem value="pause_execution">Pause Execution</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setRuleDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createRuleMutation.isPending}>
                        {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule: any) => (
              <Card key={rule.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{rule.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">Priority {rule.priority}</Badge>
                      {rule.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      {rule.description || "No description"}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Messages</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingMessages || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processed Messages</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.processedMessages || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Messages</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.failedMessages || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Messages by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats?.messagesByType || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Messages by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats?.messagesByPriority || {}).map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <span className="capitalize">{priority}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}