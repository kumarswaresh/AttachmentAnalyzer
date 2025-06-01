import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Activity, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Users,
  Zap,
  Shield,
  Settings,
  Pause,
  Play,
  Eye,
  Brain,
  DollarSign,
  Timer,
  Gauge
} from "lucide-react";

interface PerformanceMetrics {
  agentId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  costPerExecution: number;
  totalCost: number;
  lastExecuted: string;
  errorRate: number;
  reliability: 'excellent' | 'good' | 'fair' | 'poor';
}

interface SecurityEvent {
  id: string;
  agentId: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  details: string;
  resolved: boolean;
}

interface AlertConfig {
  thresholds: {
    errorRatePercent: number;
    responseTimeMs: number;
    failureCount: number;
    costPerHour: number;
  };
  notifications: {
    email?: string;
    webhook?: string;
    slack?: string;
  };
  enabled: boolean;
}

export default function Monitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    thresholds: {
      errorRatePercent: 10,
      responseTimeMs: 5000,
      failureCount: 5,
      costPerHour: 10
    },
    notifications: {},
    enabled: true
  });

  // Fetch system overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["/api/oversight/overview"],
    refetchInterval: 30000
  });

  // Fetch all agent metrics
  const { data: allMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/oversight/metrics"],
    refetchInterval: 15000
  });

  // Fetch security events
  const { data: securityEvents, isLoading: securityLoading } = useQuery({
    queryKey: ["/api/oversight/security-events"],
    refetchInterval: 10000
  });

  // Fetch execution trends for selected agent
  const { data: trends } = useQuery({
    queryKey: ["/api/oversight/trends", selectedAgent],
    enabled: !!selectedAgent,
    refetchInterval: 30000
  });

  // Mutations for agent control
  const pauseAgentMutation = useMutation({
    mutationFn: async ({ agentId, reason }: { agentId: string; reason: string }) => {
      return await apiRequest("POST", `/api/oversight/agents/${agentId}/pause`, { reason });
    },
    onSuccess: () => {
      toast({ title: "Agent Paused", description: "Agent has been successfully paused" });
      queryClient.invalidateQueries({ queryKey: ["/api/oversight/metrics"] });
    }
  });

  const resumeAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return await apiRequest("POST", `/api/oversight/agents/${agentId}/resume`);
    },
    onSuccess: () => {
      toast({ title: "Agent Resumed", description: "Agent has been successfully resumed" });
      queryClient.invalidateQueries({ queryKey: ["/api/oversight/metrics"] });
    }
  });

  const resolveSecurityEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return await apiRequest("POST", `/api/oversight/security-events/${eventId}/resolve`);
    },
    onSuccess: () => {
      toast({ title: "Security Event Resolved", description: "Event has been marked as resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/oversight/security-events"] });
    }
  });

  const saveAlertConfigMutation = useMutation({
    mutationFn: async ({ agentId, config }: { agentId: string; config: AlertConfig }) => {
      return await apiRequest("POST", `/api/oversight/alerts/${agentId}`, config);
    },
    onSuccess: () => {
      toast({ title: "Alert Configuration Saved", description: "Alert settings have been updated" });
      setAlertDialogOpen(false);
    }
  });

  if (overviewLoading || metricsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agent Oversight & Performance Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive monitoring with sophisticated performance analytics
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
          <TabsTrigger value="security">Security & Compliance</TabsTrigger>
          <TabsTrigger value="controls">Agent Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalAgents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {overview?.activeAgents || 0} active, {overview?.pausedAgents || 0} paused
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalExecutions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all agents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.overallSuccessRate?.toFixed(1) || 0}%</div>
                <Progress value={overview?.overallSuccessRate || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overview?.totalCost?.toFixed(2) || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Operational costs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Alerts */}
          {(overview?.securityAlerts > 0 || overview?.complianceIssues > 0) && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overview?.securityAlerts > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-800">Security Alerts</span>
                      <Badge variant="destructive">{overview.securityAlerts}</Badge>
                    </div>
                  )}
                  {overview?.complianceIssues > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-800">Compliance Issues</span>
                      <Badge variant="destructive">{overview.complianceIssues}</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Agent Performance Metrics
              </CardTitle>
              <CardDescription>
                Detailed performance analytics for all agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {allMetrics && allMetrics.length > 0 ? (
                  allMetrics.map((metrics: PerformanceMetrics) => (
                    <div key={metrics.agentId} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Brain className="h-5 w-5 text-blue-600" />
                          <div>
                            <h3 className="font-semibold">{metrics.agentId}</h3>
                            <Badge className={getReliabilityColor(metrics.reliability)}>
                              {metrics.reliability}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Last executed</div>
                          <div className="text-sm">{new Date(metrics.lastExecuted).toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{metrics.totalExecutions}</div>
                          <div className="text-xs text-muted-foreground">Total Executions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Success Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{metrics.averageResponseTime.toFixed(0)}ms</div>
                          <div className="text-xs text-muted-foreground">Avg Response</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">${metrics.totalCost.toFixed(4)}</div>
                          <div className="text-xs text-muted-foreground">Total Cost</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAgent(metrics.agentId)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Trends
                        </Button>
                        <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Settings className="h-4 w-4 mr-1" />
                              Configure Alerts
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Alert Configuration</DialogTitle>
                              <DialogDescription>
                                Set thresholds for automated alerts and notifications
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Enable Alerts</Label>
                                <Switch
                                  checked={alertConfig.enabled}
                                  onCheckedChange={(enabled) => 
                                    setAlertConfig(prev => ({ ...prev, enabled }))
                                  }
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Error Rate Threshold (%)</Label>
                                  <Input
                                    type="number"
                                    value={alertConfig.thresholds.errorRatePercent}
                                    onChange={(e) => setAlertConfig(prev => ({
                                      ...prev,
                                      thresholds: {
                                        ...prev.thresholds,
                                        errorRatePercent: Number(e.target.value)
                                      }
                                    }))}
                                  />
                                </div>
                                <div>
                                  <Label>Response Time Threshold (ms)</Label>
                                  <Input
                                    type="number"
                                    value={alertConfig.thresholds.responseTimeMs}
                                    onChange={(e) => setAlertConfig(prev => ({
                                      ...prev,
                                      thresholds: {
                                        ...prev.thresholds,
                                        responseTimeMs: Number(e.target.value)
                                      }
                                    }))}
                                  />
                                </div>
                              </div>
                              <Button
                                onClick={() => saveAlertConfigMutation.mutate({
                                  agentId: metrics.agentId,
                                  config: alertConfig
                                })}
                                disabled={saveAlertConfigMutation.isPending}
                              >
                                Save Configuration
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance metrics available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Events & Compliance
              </CardTitle>
              <CardDescription>
                Monitor security violations and compliance issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents && securityEvents.length > 0 ? (
                  securityEvents.map((event: SecurityEvent) => (
                    <div key={event.id} className={`p-4 border rounded-lg ${getSeverityColor(event.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{event.type}</Badge>
                            <Badge variant="secondary">{event.severity}</Badge>
                            <span className="text-sm text-muted-foreground">{event.agentId}</span>
                          </div>
                          <p className="text-sm">{event.details}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {!event.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveSecurityEventMutation.mutate(event.id)}
                            disabled={resolveSecurityEventMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No security events found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Agent Control Center
              </CardTitle>
              <CardDescription>
                Pause, resume, and manage agent operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allMetrics && allMetrics.length > 0 ? (
                  allMetrics.map((metrics: PerformanceMetrics) => (
                    <div key={metrics.agentId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Brain className="h-5 w-5 text-blue-600" />
                        <div>
                          <h3 className="font-medium">{metrics.agentId}</h3>
                          <p className="text-sm text-muted-foreground">
                            {metrics.totalExecutions} executions • {metrics.successRate.toFixed(1)}% success rate
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pauseAgentMutation.mutate({
                            agentId: metrics.agentId,
                            reason: "Manual pause from oversight panel"
                          })}
                          disabled={pauseAgentMutation.isPending}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resumeAgentMutation.mutate(metrics.agentId)}
                          disabled={resumeAgentMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No agents available for control
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}