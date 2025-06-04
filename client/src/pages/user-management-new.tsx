import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Search,
  UserCheck,
  UserX,
  Settings,
  Shield,
  Activity,
  Calendar,
  Users,
  Database,
  Cpu,
  HardDrive,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  organization: string;
  userType: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin: string;
  agentsCount: number;
  apiCallsToday: number;
  creditsUsedToday: number;
  creditsRemaining: number;
  storageUsedMB: number;
  deploymentsActive: number;
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with proper data handling
  const { data: usersResponse, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users", { search: searchTerm }],
    queryFn: () => apiRequest("GET", `/api/admin/users?search=${searchTerm}`),
  });

  // Process users data properly
  let usersList: User[] = [];
  if (usersResponse) {
    if (Array.isArray(usersResponse)) {
      usersList = usersResponse;
    } else if (usersResponse.users && Array.isArray(usersResponse.users)) {
      usersList = usersResponse.users;
    } else if (usersResponse.data && Array.isArray(usersResponse.data)) {
      usersList = usersResponse.data;
    }
  }

  console.log('UserManagement New Debug:', { 
    usersResponse, 
    usersList, 
    loadingUsers,
    isArray: Array.isArray(usersResponse)
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

  const getStatusBadge = (status: string) => (
    <Badge variant={status === 'active' ? "default" : "secondary"}>
      {status === 'active' ? "Active" : "Inactive"}
    </Badge>
  );

  const getUserTypeBadge = (userType: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      enterprise: "default",
      paid: "secondary",
      standard: "outline"
    };
    return (
      <Badge variant={variants[userType] || "outline"} className="text-xs">
        {userType || 'standard'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Never') return 'Never';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage users, monitor activity, and control access across your platform
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1">
                <Users className="h-4 w-4 mr-1" />
                {usersList.length} Users
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">User Directory</CardTitle>
              <div className="flex items-center gap-4">
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
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                <span className="ml-3 text-muted-foreground">Loading users...</span>
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? `No users match "${searchTerm}"` : "No users available"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role & Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Resources</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersList.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {user.organization}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="text-xs w-fit">
                              <Shield className="h-3 w-3 mr-1" />
                              {user.role}
                            </Badge>
                            {getUserTypeBadge(user.userType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              <span>API: {user.apiCallsToday || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              <span>Agents: {user.agentsCount || 0}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Cpu className="h-3 w-3" />
                              <span>Credits: {user.creditsUsedToday || 0}/{user.creditsRemaining || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              <span>Storage: {user.storageUsedMB || 0}MB</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created: {formatDate(user.createdAt)}</span>
                            </div>
                            <div className="text-muted-foreground">
                              Last: {formatDate(user.lastLogin)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateUserStatusMutation.mutate({
                                  userId: user.id,
                                  isActive: user.status !== 'active'
                                })
                              }
                              disabled={updateUserStatusMutation.isPending}
                            >
                              {user.status === 'active' ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}