import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Key, 
  Cloud, 
  Zap, 
  Brain, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Copy,
  TestTube,
  Save,
  Trash2,
  Plus
} from "lucide-react";

interface Credential {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  keyType: string;
  isRequired: boolean;
  isConfigured: boolean;
  awsParameterPath?: string;
  useAwsParameterStore: boolean;
  metadata?: {
    website?: string;
    documentation?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CredentialSummary {
  total: number;
  configured: number;
  required: number;
  missing: number;
  byCategory: Record<string, { total: number; configured: number }>;
}

const categoryIcons = {
  mcp: <Zap className="h-4 w-4" />,
  ai_model: <Brain className="h-4 w-4" />,
  cloud: <Cloud className="h-4 w-4" />,
  integration: <Settings className="h-4 w-4" />
};

const categoryColors = {
  mcp: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ai_model: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", 
  cloud: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  integration: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
};

export default function CredentialsManagement() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingCredential, setEditingCredential] = useState<string | null>(null);
  const [credentialValues, setCredentialValues] = useState<Record<string, {
    value: string;
    useAwsParameterStore: boolean;
    awsParameterPath: string;
  }>>({});

  // Fetch all credentials
  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['/api/credentials'],
    refetchInterval: 10000,
  });

  // Fetch credential summary
  const { data: summary } = useQuery<CredentialSummary>({
    queryKey: ['/api/credentials/summary'],
    refetchInterval: 10000,
  });

  // Fetch missing credentials
  const { data: missingCredentials = [] } = useQuery({
    queryKey: ['/api/credentials/missing'],
    refetchInterval: 10000,
  });

  // Test AWS connection
  const { data: awsConnection } = useQuery({
    queryKey: ['/api/credentials/aws/test'],
    refetchInterval: 30000,
  });

  // Set credential mutation
  const setCredentialMutation = useMutation({
    mutationFn: async ({ name, value, useAwsParameterStore, awsParameterPath }: {
      name: string;
      value: string;
      useAwsParameterStore: boolean;
      awsParameterPath?: string;
    }) => {
      return await apiRequest('POST', `/api/credentials/${name}/set`, {
        value,
        useAwsParameterStore,
        awsParameterPath
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Credential Updated",
        description: `${variables.name} has been configured successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials/missing'] });
      setEditingCredential(null);
      setCredentialValues(prev => ({ ...prev, [variables.name]: { value: '', useAwsParameterStore: false, awsParameterPath: '' } }));
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
    mutationFn: async (name: string) => {
      return await apiRequest('DELETE', `/api/credentials/${name}`);
    },
    onSuccess: (_, name) => {
      toast({
        title: "Credential Cleared",
        description: `${name} has been cleared successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials/missing'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Clear Credential",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCredentials = credentials.filter((cred: Credential) => 
    selectedCategory === "all" || cred.category === selectedCategory
  );

  const categories = Array.from(new Set(credentials.map((cred: Credential) => cred.category)));

  const handleSaveCredential = (credential: Credential) => {
    const values = credentialValues[credential.name];
    if (!values?.value) {
      toast({
        title: "Error",
        description: "Please enter a value for the credential.",
        variant: "destructive",
      });
      return;
    }

    setCredentialMutation.mutate({
      name: credential.name,
      value: values.value,
      useAwsParameterStore: values.useAwsParameterStore,
      awsParameterPath: values.awsParameterPath || undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Credentials Management</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Credentials Management</h2>
          <p className="text-muted-foreground">
            Securely manage API keys for MCP connectors, AI models, cloud services, and integrations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Encrypted Storage
          </Badge>
          {awsConnection?.connected && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              AWS Connected
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credentials</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Configured</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.configured}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((summary.configured / summary.total) * 100)}% complete
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Required</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.required}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missing Required</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.missing}</div>
              {summary.missing > 0 && (
                <p className="text-xs text-red-600">Action required</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Missing Credentials Alert */}
      {missingCredentials.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-5 w-5" />
              Missing Required Credentials
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              The following required credentials need to be configured for full functionality:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missingCredentials.map((cred: Credential) => (
                <Badge key={cred.id} variant="outline" className="text-orange-700 border-orange-300">
                  {cred.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex items-center space-x-2">
        <Label htmlFor="category-filter">Filter by category:</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                <div className="flex items-center gap-2">
                  {categoryIcons[category as keyof typeof categoryIcons]}
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Credentials List */}
      <div className="grid gap-6">
        {categories.map(category => {
          const categoryCredentials = filteredCredentials.filter((cred: Credential) => 
            selectedCategory === "all" ? cred.category === category : true
          );
          
          if (categoryCredentials.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {categoryIcons[category as keyof typeof categoryIcons]}
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <Badge className={categoryColors[category as keyof typeof categoryColors]}>
                    {categoryCredentials.length} credentials
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryCredentials.map((credential: Credential) => (
                  <Card key={credential.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {credential.name}
                            {credential.isRequired && (
                              <Badge variant="outline" className="text-xs">Required</Badge>
                            )}
                            {credential.isConfigured ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Configured
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not configured
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{credential.description}</CardDescription>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Provider: {credential.provider}</span>
                            <span>Type: {credential.keyType}</span>
                            {credential.useAwsParameterStore && (
                              <Badge variant="outline" className="text-xs">
                                <Cloud className="h-3 w-3 mr-1" />
                                AWS Parameter Store
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {credential.metadata?.website && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(credential.metadata?.website, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {editingCredential === credential.name ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSaveCredential(credential)}
                                disabled={setCredentialMutation.isPending}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCredential(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCredential(credential.name);
                                  setCredentialValues(prev => ({
                                    ...prev,
                                    [credential.name]: {
                                      value: '',
                                      useAwsParameterStore: credential.useAwsParameterStore,
                                      awsParameterPath: credential.awsParameterPath || ''
                                    }
                                  }));
                                }}
                              >
                                <Key className="h-4 w-4 mr-1" />
                                Configure
                              </Button>
                              {credential.isConfigured && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteCredentialMutation.mutate(credential.name)}
                                  disabled={deleteCredentialMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {editingCredential === credential.name && (
                      <CardContent className="space-y-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor={`value-${credential.name}`}>
                            {credential.keyType === 'api_key' ? 'API Key' : 'Value'} *
                          </Label>
                          <Textarea
                            id={`value-${credential.name}`}
                            placeholder={`Enter your ${credential.keyType.replace('_', ' ')}`}
                            value={credentialValues[credential.name]?.value || ''}
                            onChange={(e) => setCredentialValues(prev => ({
                              ...prev,
                              [credential.name]: {
                                ...prev[credential.name],
                                value: e.target.value
                              }
                            }))}
                            className="min-h-[100px]"
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`aws-${credential.name}`}
                              checked={credentialValues[credential.name]?.useAwsParameterStore || false}
                              onCheckedChange={(checked) => setCredentialValues(prev => ({
                                ...prev,
                                [credential.name]: {
                                  ...prev[credential.name],
                                  useAwsParameterStore: checked
                                }
                              }))}
                            />
                            <Label htmlFor={`aws-${credential.name}`}>
                              Store in AWS Parameter Store
                            </Label>
                          </div>

                          {credentialValues[credential.name]?.useAwsParameterStore && (
                            <div className="space-y-2">
                              <Label htmlFor={`aws-path-${credential.name}`}>
                                AWS Parameter Store Path
                              </Label>
                              <Input
                                id={`aws-path-${credential.name}`}
                                placeholder={`/agent-platform/credentials/${credential.name}`}
                                value={credentialValues[credential.name]?.awsParameterPath || ''}
                                onChange={(e) => setCredentialValues(prev => ({
                                  ...prev,
                                  [credential.name]: {
                                    ...prev[credential.name],
                                    awsParameterPath: e.target.value
                                  }
                                }))}
                              />
                            </div>
                          )}
                        </div>

                        {credential.metadata?.documentation && (
                          <div className="text-sm text-muted-foreground">
                            <a 
                              href={credential.metadata.documentation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Documentation
                            </a>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}