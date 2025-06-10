import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building, Users, Plus, Edit, Trash2, Eye, Settings } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    agents: number;
  };
}

export default function OrganizationManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true
  });

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["/api/admin/organizations"],
    retry: false,
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/organizations", data);
    },
    onSuccess: () => {
      toast({
        title: "Organization Created",
        description: "New organization has been created successfully",
      });
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Organization",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/admin/organizations/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Organization Updated",
        description: "Organization has been updated successfully",
      });
      setEditingOrg(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Organization",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/organizations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Organization Deleted",
        description: "Organization has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Organization",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      isActive: true
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) {
      toast({
        title: "Invalid Input",
        description: "Please provide organization name and slug",
        variant: "destructive",
      });
      return;
    }

    if (editingOrg) {
      updateOrgMutation.mutate({ id: editingOrg.id, data: formData });
    } else {
      createOrgMutation.mutate(formData);
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      slug: org.slug,
      description: org.description || "",
      isActive: org.isActive
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this organization?")) {
      deleteOrgMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-gray-600 mt-2">
            Manage organizations and their settings
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingOrg(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? "Edit Organization" : "Create New Organization"}
              </DialogTitle>
              <DialogDescription>
                {editingOrg ? "Update organization details" : "Set up a new organization"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug</Label>
                <Input
                  id="org-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="organization-slug"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-description">Description</Label>
                <Textarea
                  id="org-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Organization description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-status">Status</Label>
                <Select
                  value={formData.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value === "active" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createOrgMutation.isPending || updateOrgMutation.isPending}
                className="w-full"
              >
                {createOrgMutation.isPending || updateOrgMutation.isPending 
                  ? "Saving..." 
                  : editingOrg ? "Update Organization" : "Create Organization"
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org: Organization) => (
          <Card key={org.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={org.isActive ? "default" : "secondary"}>
                  {org.isActive ? "Active" : "Inactive"}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(org)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(org.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                {org.name}
              </CardTitle>
              <CardDescription className="text-sm">
                {org.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Slug:</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {org.slug}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Users:
                  </span>
                  <span className="font-medium">
                    {org._count?.users || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Agents:</span>
                  <span className="font-medium">
                    {org._count?.agents || 0}
                  </span>
                </div>

                <div className="pt-2 text-xs text-gray-400">
                  Created: {new Date(org.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first organization</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        </div>
      )}
    </div>
  );
}