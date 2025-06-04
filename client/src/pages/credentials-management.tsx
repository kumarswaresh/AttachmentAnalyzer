import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Key, Edit, Trash2, CheckCircle, AlertCircle, Star, Tag, Cloud, Lock } from "lucide-react";

interface CredentialInstance {
  id: number;
  name: string;
  provider: string;
  keyType: string;
  category: string;
  description?: string;
  isConfigured: boolean;
  isDefault: boolean;
  tags: string[];
  storageType: string;
  awsParameterName?: string;
  createdAt: string;
  updatedAt: string;
}

interface CredentialStats {
  total: number;
  configured: number;
  unconfigured: number;
  providers: number;
  providerList: string[];
}

export default function CredentialsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CredentialInstance | null>(null);
  
  const [newCredential, setNewCredential] = useState({
    name: '',
    provider: '',
    keyType: 'api_key',
    category: 'AI Models',
    description: '',
    value: '',
    storageType: 'internal' as 'internal' | 'aws_parameter_store',
    awsParameterName: '',
    isDefault: false,
    tags: [] as string[]
  });

  // Fetch all credentials
  const { data: credentials = [], isLoading: credentialsLoading } = useQuery<CredentialInstance[]>({
    queryKey: ['/api/credentials'],
  });

  // Fetch credential stats
  const { data: stats } = useQuery<CredentialStats>({
    queryKey: ['/api/credentials/stats'],
  });

  // Create credential mutation
  const createCredentialMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/credentials', data),
    onSuccess: () => {
      toast({
        title: "Credential Created",
        description: "New credential has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Credential",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update credential mutation
  const updateCredentialMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/credentials/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Credential Updated",
        description: "Credential has been updated successfully.",
      });
      setEditingCredential(null);
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Credential",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete credential mutation
  const deleteCredentialMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/credentials/${id}`),
    onSuccess: () => {
      toast({
        title: "Credential Deleted",
        description: "Credential has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Credential",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewCredential({
      name: '',
      provider: '',
      keyType: 'api_key',
      category: 'AI Models',
      description: '',
      value: '',
      storageType: 'internal',
      awsParameterName: '',
      isDefault: false,
      tags: []
    });
  };

  const handleCreateCredential = () => {
    if (!newCredential.name || !newCredential.provider || !newCredential.value) {
      toast({
        title: "Missing Information",
        description: "Please provide name, provider, and value for the credential.",
        variant: "destructive",
      });
      return;
    }
    createCredentialMutation.mutate(newCredential);
  };

  const handleUpdateCredential = () => {
    if (!editingCredential) return;
    updateCredentialMutation.mutate({
      id: editingCredential.id,
      data: editingCredential
    });
  };

  // Filter credentials
  const filteredCredentials = credentials.filter(cred => {
    const providerMatch = selectedProvider === "all" || cred.provider === selectedProvider;
    const categoryMatch = selectedCategory === "all" || cred.category === selectedCategory;
    return providerMatch && categoryMatch;
  });

  // Group credentials by provider
  const groupedCredentials = filteredCredentials.reduce((acc, cred) => {
    if (!acc[cred.provider]) {
      acc[cred.provider] = [];
    }
    acc[cred.provider].push(cred);
    return acc;
  }, {} as Record<string, CredentialInstance[]>);

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'aws': 'AWS',
      'serpapi': 'SerpAPI',
      'google_maps': 'Google Maps',
      'weatherapi': 'WeatherAPI'
    };
    return names[provider] || provider;
  };

  const providers = ['openai', 'anthropic', 'aws', 'serpapi', 'google_maps', 'weatherapi'];
  const categories = ['AI Models', 'Cloud Services', 'MCP Connectors', 'Custom'];

  if (credentialsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Credential Management</h1>
          <p className="text-muted-foreground">
            Manage multiple API keys per provider with secure storage options
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Credential</DialogTitle>
              <DialogDescription>
                Add a new API credential for use in your agents and workflows.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cred-name">Credential Name</Label>
                <Input
                  id="cred-name"
                  value={newCredential.name}
                  onChange={(e) => setNewCredential(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My OpenAI Key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cred-provider">Provider</Label>
                <Select
                  value={newCredential.provider}
                  onValueChange={(value) => setNewCredential(prev => ({ ...prev, provider: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map(provider => (
                      <SelectItem key={provider} value={provider}>
                        {getProviderDisplayName(provider)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cred-category">Category</Label>
                <Select
                  value={newCredential.category}
                  onValueChange={(value) => setNewCredential(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cred-value">API Key Value</Label>
                <Input
                  id="cred-value"
                  type="password"
                  value={newCredential.value}
                  onChange={(e) => setNewCredential(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Enter your API key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cred-description">Description (Optional)</Label>
                <Textarea
                  id="cred-description"
                  value={newCredential.description}
                  onChange={(e) => setNewCredential(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description of this credential's purpose"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="cred-default"
                  checked={newCredential.isDefault}
                  onCheckedChange={(checked) => setNewCredential(prev => ({ ...prev, isDefault: checked }))}
                />
                <Label htmlFor="cred-default">Set as default for this provider</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="cred-aws"
                  checked={newCredential.storageType === 'aws_parameter_store'}
                  onCheckedChange={(checked) => setNewCredential(prev => ({ 
                    ...prev, 
                    storageType: checked ? 'aws_parameter_store' : 'internal' 
                  }))}
                />
                <Label htmlFor="cred-aws">Store in AWS Parameter Store</Label>
              </div>

              {newCredential.storageType === 'aws_parameter_store' && (
                <div className="space-y-2">
                  <Label htmlFor="cred-aws-param">AWS Parameter Name</Label>
                  <Input
                    id="cred-aws-param"
                    value={newCredential.awsParameterName}
                    onChange={(e) => setNewCredential(prev => ({ ...prev, awsParameterName: e.target.value }))}
                    placeholder={`/agent-platform/${newCredential.provider}-api-key`}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCredential}
                  disabled={createCredentialMutation.isPending}
                >
                  {createCredentialMutation.isPending ? "Creating..." : "Create Credential"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credentials</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Configured</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.configured}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unconfigured</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.unconfigured}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Providers</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.providers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="space-y-2">
          <Label>Filter by Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providers.map(provider => (
                <SelectItem key={provider} value={provider}>
                  {getProviderDisplayName(provider)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Filter by Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Credentials Grid */}
      <div className="space-y-6">
        {Object.entries(groupedCredentials).map(([provider, providerCredentials]) => (
          <div key={provider} className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              {getProviderDisplayName(provider)}
              <Badge variant="outline">
                {providerCredentials.length} credential{providerCredentials.length !== 1 ? 's' : ''}
              </Badge>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerCredentials.map((credential) => (
                <Card key={credential.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        {credential.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        {credential.isDefault && (
                          <Badge variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                        <Badge variant={credential.isConfigured ? "default" : "secondary"}>
                          {credential.isConfigured ? "Configured" : "Unconfigured"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>{credential.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{credential.keyType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Category:</span>
                        <span>{credential.category}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Storage:</span>
                        <span className="flex items-center gap-1">
                          {credential.storageType === 'aws_parameter_store' ? (
                            <>
                              <Cloud className="h-3 w-3" />
                              AWS
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              Internal
                            </>
                          )}
                        </span>
                      </div>
                      
                      {credential.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {credential.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCredential(credential)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Credential</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{credential.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCredentialMutation.mutate(credential.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCredentials.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No credentials found</h3>
            <p className="text-muted-foreground mb-4">
              {selectedProvider !== "all" || selectedCategory !== "all"
                ? "Try adjusting your filters or create a new credential."
                : "Get started by creating your first credential."}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Credential Dialog */}
      {editingCredential && (
        <Dialog open={!!editingCredential} onOpenChange={() => setEditingCredential(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Credential</DialogTitle>
              <DialogDescription>
                Update the credential information.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Credential Name</Label>
                <Input
                  value={editingCredential.name}
                  onChange={(e) => setEditingCredential(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingCredential.description || ''}
                  onChange={(e) => setEditingCredential(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingCredential.isDefault}
                  onCheckedChange={(checked) => setEditingCredential(prev => prev ? { ...prev, isDefault: checked } : null)}
                />
                <Label>Set as default for {getProviderDisplayName(editingCredential.provider)}</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingCredential(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateCredential}
                  disabled={updateCredentialMutation.isPending}
                >
                  {updateCredentialMutation.isPending ? "Updating..." : "Update Credential"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}