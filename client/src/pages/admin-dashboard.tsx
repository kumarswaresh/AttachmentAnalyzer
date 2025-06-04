import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Users, Building2, CreditCard, Activity, Database, Shield, Zap, TrendingUp, AlertTriangle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SuperAdminStats {
  totalUsers: number;
  totalOrganizations: number;
  totalCredits: number;
  totalApiCalls: number;
  totalAgents: number;
  totalDeployments: number;
  storageUsedGB: number;
  monthlyRevenue: number;
  activeTrials: number;
  creditsConsumed24h: number;
}

interface OrganizationOverview {
  id: number;
  name: string;
  slug: string;
  plan: string;
  userCount: number;
  creditsRemaining: number;
  monthlyUsage: number;
  status: 'active' | 'trial' | 'suspended';
  lastActivity: string;
  owner: string;
}

interface UserOverview {
  id: number;
  username: string;
  email: string;
  role: string;
  organization: string;
  lastLogin: string;
  status: 'active' | 'suspended';
  apiCallsToday: number;
  creditsUsedToday: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("24h");

  // Fetch SuperAdmin statistics
  const { data: stats, isLoading: statsLoading } = useQuery<SuperAdminStats>({
    queryKey: ['/api/admin/stats', timeRange],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch organizations overview
  const { data: organizations = [], isLoading: orgsLoading } = useQuery<OrganizationOverview[]>({
    queryKey: ['/api/admin/organizations', selectedOrg],
  });

  // Fetch users overview with cross-tenant access
  const { data: users = [], isLoading: usersLoading } = useQuery<UserOverview[]>({
    queryKey: ['/api/admin/users', selectedOrg, searchTerm],
  });

  // User impersonation mutation
  const impersonateMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('POST', '/api/admin/impersonate', { userId });
    },
    onSuccess: (data) => {
      toast({
        title: "User Impersonation Active",
        description: `You are now viewing as ${data.username}`,
      });
      // Redirect to main dashboard in impersonation mode
      window.location.href = "/?impersonate=true";
    },
    onError: (error: any) => {
      toast({
        title: "Impersonation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Organization management mutation
  const updateOrgMutation = useMutation({
    mutationFn: async ({ orgId, action }: { orgId: number; action: 'suspend' | 'activate' | 'upgrade' | 'downgrade' }) => {
      return apiRequest('POST', `/api/admin/organizations/${orgId}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      toast({
        title: "Organization Updated",
        description: "Organization status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImpersonate = (userId: number) => {
    impersonateMutation.mutate(userId);
  };

  const handleOrgAction = (orgId: number, action: 'suspend' | 'activate' | 'upgrade' | 'downgrade') => {
    updateOrgMutation.mutate({ orgId, action });
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SuperAdmin Dashboard</h1>
          <p className="text-muted-foreground">
            Cross-tenant monitoring and management console
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <Shield className="w-3 h-3 mr-1" />
            SuperAdmin Mode
          </Badge>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString() || 0}</div>
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
            <p className="text-xs text-muted-foreground">
              {stats?.activeTrials} active trials
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Pool</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCredits?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.creditsConsumed24h?.toLocaleString()} used today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.monthlyRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Monthly recurring</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">API Calls (24h)</span>
              <Badge variant="outline">{stats?.totalApiCalls?.toLocaleString()}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Agents</span>
              <Badge variant="outline">{stats?.totalAgents}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Deployments</span>
              <Badge variant="outline">{stats?.totalDeployments}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Storage Used</span>
                <span>{stats?.storageUsedGB}GB / 1000GB</span>
              </div>
              <Progress value={(stats?.storageUsedGB || 0) / 10} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Health Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">High API Usage</p>
                  <p className="text-xs text-muted-foreground">3 orgs approaching limits</p>
                </div>
                <Badge variant="secondary">Warning</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">System Health</p>
                  <p className="text-xs text-muted-foreground">All services operational</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Good</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Management Tabs */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>
                Manage all client organizations with full administrative access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search organizations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="trial">Trial Only</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">@{org.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.plan === 'enterprise' ? 'default' : 'secondary'}>
                            {org.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.userCount}</TableCell>
                        <TableCell>
                          <div>
                            <p>{org.creditsRemaining.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {org.monthlyUsage} used this month
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              org.status === 'active' ? 'default' : 
                              org.status === 'trial' ? 'secondary' : 'destructive'
                            }
                          >
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{org.lastActivity}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/admin/orgs/${org.id}`, '_blank')}
                            >
                              View
                            </Button>
                            {org.status === 'active' ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleOrgAction(org.id, 'suspend')}
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleOrgAction(org.id, 'activate')}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Tenant User Management</CardTitle>
              <CardDescription>
                View and manage users across all organizations with impersonation capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Search users by name, email, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Usage Today</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.organization}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{user.lastLogin}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{user.apiCallsToday} API calls</p>
                            <p className="text-muted-foreground">{user.creditsUsedToday} credits</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.status === 'active' ? 'default' : 'destructive'}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImpersonate(user.id)}
                              disabled={impersonateMutation.isPending}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              Impersonate
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/admin/users/${user.id}`, '_blank')}
                            >
                              Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                Platform-wide usage monitoring and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Comprehensive usage analytics dashboard coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Management</CardTitle>
              <CardDescription>
                Credit allocation and billing oversight
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Advanced billing management interface coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}