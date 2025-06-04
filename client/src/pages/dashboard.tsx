import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Building2, 
  Bot, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Settings,
  Play,
  UserPlus,
  Shield
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalOrganizations: number;
  totalAgents: number;
  totalAgentApps: number;
  totalCredentials: number;
  activeDeployments: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: string;
    memoryUsage: number;
    cpuUsage: number;
  };
}

interface OrganizationData {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  agentCount: number;
  appCount: number;
  isActive: boolean;
  creditsUsed: number;
  creditsLimit: number;
}

export default function Dashboard() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [isSettingUpDemo, setIsSettingUpDemo] = useState(false);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
    enabled: isSuperAdmin,
  });

  // Fetch organizations data
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<OrganizationData[]>({
    queryKey: ['/api/admin/organizations'],
    enabled: isSuperAdmin,
  });

  // Setup demo environment mutation
  const setupDemoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/setup/demo-environment');
    },
    onSuccess: (data) => {
      toast({
        title: "Demo Environment Created",
        description: `Successfully created ${data.summary.totalOrganizations} organizations with users, agents, and apps`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup demo environment",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSettingUpDemo(false);
    }
  });

  const handleSetupDemo = async () => {
    setIsSettingUpDemo(true);
    setupDemoMutation.mutate();
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600">This dashboard is only available to SuperAdmin users.</p>
        </div>
      </div>
    );
  }

  if (statsLoading || orgsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SuperAdmin Dashboard</h1>
          <p className="text-gray-600 mt-1">System overview and management controls</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={handleSetupDemo}
            disabled={isSettingUpDemo}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSettingUpDemo ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Setting Up...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Setup Demo Environment
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Across all organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
                <p className="text-xs text-muted-foreground">Active client organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalAgents || 0}</div>
                <p className="text-xs text-muted-foreground">AI agents deployed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agent Apps</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalAgentApps || 0}</div>
                <p className="text-xs text-muted-foreground">Running applications</p>
              </CardContent>
            </Card>
          </div>

          {/* Demo Setup Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="mr-2 h-5 w-5" />
                Demo Environment Setup
              </CardTitle>
              <CardDescription>
                Create a complete demo environment with SuperAdmin users, client organizations, and sample data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900">3 SuperAdmin Users</h4>
                    <p className="text-sm text-blue-700">superadmin1, superadmin2, superadmin3</p>
                    <p className="text-xs text-blue-600 mt-1">Password: admin123</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900">5 Client Organizations</h4>
                    <p className="text-sm text-green-700">TechCorp, Marketing Pro, FinanceWise, HealthTech, EduLearn</p>
                    <p className="text-xs text-green-600 mt-1">8 users per organization</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900">Sample Data</h4>
                    <p className="text-sm text-purple-700">3 agents + 3 apps per organization</p>
                    <p className="text-xs text-purple-600 mt-1">Role-based access controls</p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSetupDemo} 
                  disabled={isSettingUpDemo}
                  className="w-full md:w-auto"
                >
                  {isSettingUpDemo ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Creating Demo Environment...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Setup Complete Demo Environment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <div className="grid gap-6">
            {organizations.map((org) => (
              <Card key={org.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Building2 className="mr-2 h-5 w-5" />
                        {org.name}
                      </CardTitle>
                      <CardDescription>{org.description}</CardDescription>
                    </div>
                    <Badge variant={org.isActive ? "default" : "secondary"}>
                      {org.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{org.memberCount} members</span>
                    </div>
                    <div className="flex items-center">
                      <Bot className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{org.agentCount} agents</span>
                    </div>
                    <div className="flex items-center">
                      <Zap className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{org.appCount} apps</span>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{org.creditsUsed}/{org.creditsLimit} credits</span>
                    </div>
                  </div>
                  
                  {org.creditsLimit > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Credit Usage</span>
                        <span>{Math.round((org.creditsUsed / org.creditsLimit) * 100)}%</span>
                      </div>
                      <Progress value={(org.creditsUsed / org.creditsLimit) * 100} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">System Status</span>
                  <Badge variant={stats?.systemHealth?.status === 'healthy' ? 'default' : 'destructive'}>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {stats?.systemHealth?.status || 'healthy'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>{stats?.systemHealth?.memoryUsage || 0}%</span>
                  </div>
                  <Progress value={stats?.systemHealth?.memoryUsage || 0} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span>{stats?.systemHealth?.cpuUsage || 0}%</span>
                  </div>
                  <Progress value={stats?.systemHealth?.cpuUsage || 0} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Uptime</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.systemHealth?.uptime || '99.9%'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}