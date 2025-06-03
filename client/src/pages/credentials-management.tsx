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
  id: number;
  keyId: string;
  displayName: string;
  description: string;
  category: string;
  storageType: string;
  awsParameterName?: string;
  isRequired: boolean;
  isConfigured: boolean;
  encryptedValue?: string;
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

export default function CredentialsManagement() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingCredential, setEditingCredential] = useState<string | null>(null);
  const [credentialValues, setCredentialValues] = useState<Record<string, {
    value: string;
    useAwsParameterStore: boolean;
    awsParameterPath: string;
  }>>({});

  // Fetch credentials
  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['/api/credentials'],
  });

  // Fetch summary
  const { data: summary } = useQuery<CredentialSummary>({
    queryKey: ['/api/credentials/summary'],
  });

  // Fetch missing credentials
  const { data: missingCredentials = [] } = useQuery({
    queryKey: ['/api/credentials/missing'],
  });

  // Fetch AWS connection status
  const { data: awsStatus } = useQuery({
    queryKey: ['/api/credentials/aws/test'],
  });

  // Set credential mutation
  const setCredentialMutation = useMutation({
    mutationFn: async (data: { name: string; value: string; useAwsParameterStore?: boolean; awsParameterPath?: string }) => {
      return apiRequest('POST', '/api/credentials/set', data);
    },
    onSuccess: () => {
      toast({
        title: "Credential Saved",
        description: "The credential has been saved successfully.",
      });
      setEditingCredential(null);
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials/missing'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Credential",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear credential mutation
  const clearCredentialMutation = useMutation({
    mutationFn: async (credentialName: string) => {
      return apiRequest('DELETE', `/api/credentials/${credentialName}`);
    },
    onSuccess: () => {
      toast({
        title: "Credential Cleared",
        description: "The credential has been cleared successfully.",
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

  const filteredCredentials = Array.isArray(credentials) ? credentials.filter((cred: Credential) => 
    selectedCategory === "all" || cred.category === selectedCategory
  ) : [];

  const categories = Array.isArray(credentials) ? Array.from(new Set(credentials.map((cred: Credential) => cred.category))) : [];

  const handleSaveCredential = (credential: Credential) => {
    const values = credentialValues[credential.keyId];
    if (!values?.value) {
      toast({
        title: "Error",
        description: "Please enter a value for the credential.",
        variant: "destructive",
      });
      return;
    }

    setCredentialMutation.mutate({
      name: credential.keyId,
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
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Credentials Management</h2>
            <p className="text-muted-foreground">
              Manage API keys and credentials for your agents and integrations
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
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
            Manage API keys and credentials for your agents and integrations
          </p>
        </div>
      </div>

      {/* AWS Connection Status */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Cloud className="h-5 w-5" />
            AWS Parameter Store Integration
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Status: {awsStatus?.connected ? 'Connected' : 'Not Connected'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {awsStatus?.message || 'No status information available'}
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credentials</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-sm font-medium">Missing</CardTitle>
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
      {Array.isArray(missingCredentials) && missingCredentials.length > 0 && (
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
                  {cred.displayName}
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
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Credentials by Category */}
      <div className="space-y-6">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No credentials found.</p>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => {
            const categoryCredentials = filteredCredentials.filter((cred: Credential) => 
              selectedCategory === "all" ? cred.category === category : cred.category === selectedCategory
            );

            if (categoryCredentials.length === 0) return null;

            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category === 'AI Models' && <Brain className="h-5 w-5" />}
                    {category === 'MCP Connectors' && <Zap className="h-5 w-5" />}
                    {category === 'Cloud Services' && <Cloud className="h-5 w-5" />}
                    {!['AI Models', 'MCP Connectors', 'Cloud Services'].includes(category) && <Key className="h-5 w-5" />}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryCredentials.map((credential: Credential) => (
                    <Card key={credential.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {credential.displayName}
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
                              <span>Key ID: {credential.keyId}</span>
                              <span>Storage: {credential.storageType}</span>
                              {credential.storageType === 'aws_parameter_store' && (
                                <Badge variant="outline" className="text-xs">
                                  <Cloud className="h-3 w-3 mr-1" />
                                  AWS Parameter Store
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {editingCredential === credential.keyId ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCredential(credential)}
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
                                    setEditingCredential(credential.keyId);
                                    setCredentialValues(prev => ({
                                      ...prev,
                                      [credential.keyId]: {
                                        value: '',
                                        useAwsParameterStore: credential.storageType === 'aws_parameter_store',
                                        awsParameterPath: credential.awsParameterName || ''
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
                                    onClick={() => clearCredentialMutation.mutate(credential.keyId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {editingCredential === credential.keyId && (
                          <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                              <Label htmlFor={`value-${credential.keyId}`}>
                                API Key Value
                              </Label>
                              <Input
                                id={`value-${credential.keyId}`}
                                type="password"
                                value={credentialValues[credential.keyId]?.value || ''}
                                onChange={(e) => setCredentialValues(prev => ({
                                  ...prev,
                                  [credential.keyId]: {
                                    ...prev[credential.keyId],
                                    value: e.target.value
                                  }
                                }))}
                                placeholder={`Enter your ${credential.keyId}`}
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`aws-${credential.keyId}`}
                                checked={credentialValues[credential.keyId]?.useAwsParameterStore || false}
                                onCheckedChange={(checked) => setCredentialValues(prev => ({
                                  ...prev,
                                  [credential.keyId]: {
                                    ...prev[credential.keyId],
                                    useAwsParameterStore: checked
                                  }
                                }))}
                              />
                              <Label htmlFor={`aws-${credential.keyId}`}>
                                Store in AWS Parameter Store
                              </Label>
                            </div>

                            {credentialValues[credential.keyId]?.useAwsParameterStore && (
                              <div className="space-y-2">
                                <Label htmlFor={`aws-path-${credential.keyId}`}>
                                  AWS Parameter Path
                                </Label>
                                <Input
                                  id={`aws-path-${credential.keyId}`}
                                  value={credentialValues[credential.keyId]?.awsParameterPath || ''}
                                  onChange={(e) => setCredentialValues(prev => ({
                                    ...prev,
                                    [credential.keyId]: {
                                      ...prev[credential.keyId],
                                      awsParameterPath: e.target.value
                                    }
                                  }))}
                                  placeholder={`/agent-platform/${credential.keyId.toLowerCase()}`}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}