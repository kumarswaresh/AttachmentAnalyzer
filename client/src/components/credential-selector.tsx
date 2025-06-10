import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Key, CheckCircle, AlertCircle, Settings, Tag } from "lucide-react";

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

interface CredentialSelectorProps {
  provider: string;
  purpose?: string;
  value?: number;
  onChange?: (credentialId: number | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showCreateButton?: boolean;
}

export function CredentialSelector({
  provider,
  purpose = "primary",
  value,
  onChange,
  label,
  placeholder = "Select a credential",
  required = false,
  showCreateButton = true
}: CredentialSelectorProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCredential, setNewCredential] = useState({
    name: '',
    provider,
    keyType: 'api_key',
    category: 'AI Models',
    description: '',
    value: '',
    storageType: 'internal' as 'internal' | 'aws_parameter_store',
    awsParameterName: '',
    isDefault: false,
    tags: [] as string[]
  });

  // Fetch credentials for the specific provider
  const { data: credentials = [], isLoading, refetch } = useQuery<CredentialInstance[]>({
    queryKey: [`/api/credentials/provider/${provider}`],
  });

  // Get configured credentials only
  const configuredCredentials = credentials.filter(cred => cred.isConfigured);
  const defaultCredential = configuredCredentials.find(cred => cred.isDefault);

  // Auto-select default credential if no value is set
  useEffect(() => {
    if (!value && defaultCredential && onChange) {
      onChange(defaultCredential.id);
    }
  }, [value, defaultCredential, onChange]);

  const handleCreateCredential = async () => {
    try {
      if (!newCredential.name || !newCredential.value) {
        toast({
          title: "Missing Information",
          description: "Please provide a name and value for the credential.",
          variant: "destructive",
        });
        return;
      }

      await apiRequest('POST', '/api/credentials', newCredential);
      
      toast({
        title: "Credential Created",
        description: `${newCredential.name} has been created successfully.`,
      });

      setIsCreateDialogOpen(false);
      setNewCredential({
        name: '',
        provider,
        keyType: 'api_key',
        category: 'AI Models',
        description: '',
        value: '',
        storageType: 'internal',
        awsParameterName: '',
        isDefault: false,
        tags: []
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Failed to Create Credential",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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

  const getCategoryForProvider = (provider: string) => {
    const categories: Record<string, string> = {
      'openai': 'AI Models',
      'anthropic': 'AI Models',
      'aws': 'Cloud Services',
      'serpapi': 'MCP Connectors',
      'google_maps': 'MCP Connectors',
      'weatherapi': 'MCP Connectors'
    };
    return categories[provider] || 'Custom';
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="flex gap-2">
        <Select
          value={value?.toString() || ''}
          onValueChange={(val) => onChange?.(val ? parseInt(val) : null)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {configuredCredentials.length === 0 ? (
              <SelectItem value="no-credentials" disabled>
                No {getProviderDisplayName(provider)} credentials configured
              </SelectItem>
            ) : (
              configuredCredentials.map((credential) => (
                <SelectItem key={credential.id} value={credential.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{credential.name}</span>
                    {credential.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                    {credential.tags.length > 0 && (
                      <div className="flex gap-1">
                        {credential.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {showCreateButton && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add {getProviderDisplayName(provider)} Credential</DialogTitle>
                <DialogDescription>
                  Create a new {getProviderDisplayName(provider)} credential for use in your agents.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cred-name">Credential Name</Label>
                  <Input
                    id="cred-name"
                    value={newCredential.name}
                    onChange={(e) => setNewCredential(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={`My ${getProviderDisplayName(provider)} Key`}
                  />
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
                  <Label htmlFor="cred-default">Set as default for {getProviderDisplayName(provider)}</Label>
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
                      placeholder={`/agent-platform/${provider}-api-key`}
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
                  <Button onClick={handleCreateCredential}>
                    Create Credential
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Show selected credential info */}
      {value && configuredCredentials.length > 0 && (
        <Card className="mt-2">
          <CardContent className="pt-3 pb-3">
            {(() => {
              const selectedCred = configuredCredentials.find(c => c.id === value);
              if (!selectedCred) return null;
              
              return (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedCred.name}</span>
                    {selectedCred.isDefault && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Configured</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Show message when no credentials are available */}
      {configuredCredentials.length === 0 && (
        <Card className="mt-2 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
              <AlertCircle className="h-4 w-4" />
              <span>No {getProviderDisplayName(provider)} credentials configured</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}