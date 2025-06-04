import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Users, 
  Shield, 
  Key, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Settings,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: string[];
  featureAccess: {
    agentBuilder: boolean;
    visualBuilder: boolean;
    mcpIntegrations: boolean;
    apiManagement: boolean;
    userManagement: boolean;
    analytics: boolean;
    deployments: boolean;
    credentials: boolean;
    billing: boolean;
  };
  resourceLimits: {
    maxAgents: number | null;
    maxDeployments: number | null;
    maxApiKeys: number | null;
    maxCredentials: number | null;
    dailyApiCalls: number | null;
    monthlyCost: number | null;
  };
}

interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  assignedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  role: Role;
}

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  permissions: string[];
  allowedEndpoints: string[];
  rateLimit: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users", { search: searchTerm }],
    queryFn: () => apiRequest("GET", `/api/admin/users?search=${searchTerm}`),
  });

  // Fetch roles
  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ["/api/roles"],
  });

  // Fetch API keys
  const { data: apiKeys, isLoading: loadingApiKeys } = useQuery({
    queryKey: ["/api/client-api-keys"],
  });

  // User status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  // Role assignment mutation
  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      apiRequest("POST", `/api/users/${userId}/roles`, { roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: (roleData: any) => apiRequest("POST", "/api/roles", roleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setShowCreateRole(false);
      toast({
        title: "Success",
        description: "Role created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      });
    },
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: (keyData: any) => apiRequest("POST", "/api/client-api-keys", keyData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-api-keys"] });
      setShowCreateApiKey(false);
      toast({
        title: "API Key Created",
        description: `Save this key: ${data.rawKey}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const users = usersData || [];

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? "default" : "secondary"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );

  const getRoleBadges = (userRoles: UserRole[]) => (
    <div className="flex flex-wrap gap-1">
      {userRoles.map((userRole) => (
        <Badge key={userRole.id} variant="outline">
          {userRole.role.name}
        </Badge>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and access control for your platform
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Users</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {user.id}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                        <TableCell>
                          {user.lastLogin 
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => 
                                updateUserStatusMutation.mutate({
                                  userId: user.id,
                                  isActive: !user.isActive
                                })
                              }
                            >
                              {user.isActive ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manage User: {user.username}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Assign Role</label>
                                    <Select
                                      onValueChange={(roleId) =>
                                        assignRoleMutation.mutate({
                                          userId: user.id,
                                          roleId: parseInt(roleId)
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roles?.map((role: Role) => (
                                          <SelectItem key={role.id} value={role.id.toString()}>
                                            {role.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Roles & Permissions</CardTitle>
                <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                    </DialogHeader>
                    <CreateRoleForm 
                      onSubmit={(data) => createRoleMutation.mutate(data)}
                      isLoading={createRoleMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {roles?.map((role: Role) => (
                    <Card key={role.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{role.name}</h3>
                              {role.isSystemRole && (
                                <Badge variant="secondary">System</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {role.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.slice(0, 3).map((permission, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {permission}
                                </Badge>
                              ))}
                              {role.permissions.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{role.permissions.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!role.isSystemRole && (
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>API Keys</CardTitle>
                <Dialog open={showCreateApiKey} onOpenChange={setShowCreateApiKey}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New API Key</DialogTitle>
                    </DialogHeader>
                    <CreateApiKeyForm 
                      onSubmit={(data) => createApiKeyMutation.mutate(data)}
                      isLoading={createApiKeyMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingApiKeys ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Rate Limit</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys?.map((apiKey: ApiKey) => (
                      <TableRow key={apiKey.id}>
                        <TableCell className="font-medium">{apiKey.name}</TableCell>
                        <TableCell className="font-mono">{apiKey.keyPrefix}...</TableCell>
                        <TableCell>{apiKey.rateLimit}/hour</TableCell>
                        <TableCell>
                          {apiKey.lastUsedAt 
                            ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                            : "Never"
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(apiKey.isActive)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Activity monitoring coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Create Role Form Component
function CreateRoleForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    featureAccess: {
      agentBuilder: false,
      visualBuilder: false,
      mcpIntegrations: false,
      apiManagement: false,
      userManagement: false,
      analytics: false,
      deployments: false,
      credentials: false,
      billing: false,
    },
    resourceLimits: {
      maxAgents: null as number | null,
      maxDeployments: null as number | null,
      maxApiKeys: null as number | null,
      maxCredentials: null as number | null,
      dailyApiCalls: null as number | null,
      monthlyCost: null as number | null,
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleFeature = (feature: keyof typeof formData.featureAccess) => {
    setFormData(prev => ({
      ...prev,
      featureAccess: {
        ...prev.featureAccess,
        [feature]: !prev.featureAccess[feature]
      }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Role Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter role name"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter role description"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Feature Access</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(formData.featureAccess).map(([feature, enabled]) => (
            <label key={feature} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => toggleFeature(feature as keyof typeof formData.featureAccess)}
                className="rounded"
              />
              <span className="text-sm capitalize">
                {feature.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating..." : "Create Role"}
      </Button>
    </form>
  );
}

// Create API Key Form Component
function CreateApiKeyForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    name: "",
    permissions: ["agent:read"],
    allowedEndpoints: ["/api/agents"],
    rateLimit: 1000,
    expiresAt: null as string | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Key Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter API key name"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Rate Limit (requests/hour)</label>
        <Input
          type="number"
          value={formData.rateLimit}
          onChange={(e) => setFormData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
          placeholder="1000"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating..." : "Create API Key"}
      </Button>
    </form>
  );
}