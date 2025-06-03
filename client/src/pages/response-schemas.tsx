import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, CheckCircle, XCircle, Plus, Edit, Trash2, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ResponseSchema {
  id: number;
  agentId: string;
  schemaName: string;
  jsonSchema: Record<string, any>;
  validationRules: Record<string, any>;
  version: string;
  isActive: boolean;
  createdAt: Date;
}

export default function ResponseSchemasPage() {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testResponse, setTestResponse] = useState<string>("");
  const [testResults, setTestResults] = useState<any>(null);
  
  const [newSchema, setNewSchema] = useState({
    name: "",
    jsonSchema: "",
    validationRules: "",
    version: "1.0.0"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ["/api/agents"]
  });

  // Fetch schemas for selected agent
  const { data: schemas = [], isLoading: schemasLoading } = useQuery({
    queryKey: ["/api/agents", selectedAgent, "schemas"],
    enabled: !!selectedAgent,
    queryFn: () => apiRequest("GET", `/api/agents/${selectedAgent}/schemas`)
  });

  // Create schema mutation
  const createSchemaMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/agents/${selectedAgent}/schemas`, data);
    },
    onSuccess: () => {
      toast({
        title: "Schema Created",
        description: "Response schema has been successfully created"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", selectedAgent, "schemas"] });
      setIsCreateDialogOpen(false);
      setNewSchema({ name: "", jsonSchema: "", validationRules: "", version: "1.0.0" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create response schema",
        variant: "destructive"
      });
    }
  });

  // Test validation mutation
  const testValidationMutation = useMutation({
    mutationFn: async (data: { response: any; schemaName?: string }) => {
      return apiRequest("POST", `/api/agents/${selectedAgent}/validate-response`, data);
    },
    onSuccess: (data) => {
      setTestResults(data);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to validate response",
        variant: "destructive"
      });
    }
  });

  const handleCreateSchema = () => {
    try {
      const jsonSchema = JSON.parse(newSchema.jsonSchema);
      const validationRules = newSchema.validationRules ? JSON.parse(newSchema.validationRules) : {};
      
      createSchemaMutation.mutate({
        name: newSchema.name,
        jsonSchema,
        validationRules,
        version: newSchema.version
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON schema format",
        variant: "destructive"
      });
    }
  };

  const handleTestValidation = (schemaName?: string) => {
    try {
      const responseData = JSON.parse(testResponse);
      testValidationMutation.mutate({
        response: responseData,
        schemaName
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your test response format",
        variant: "destructive"
      });
    }
  };

  const defaultSchemaTemplate = `{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "Main response message"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": ["message"]
}`;

  const defaultValidationRules = `{
  "required": ["message"],
  "maxLength": {
    "message": 1000
  },
  "minLength": {
    "message": 10
  },
  "ranges": {
    "confidence": {
      "min": 0,
      "max": 1
    }
  }
}`;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Response Schemas</h1>
            <p className="text-muted-foreground">
              Define and validate agent response structures with custom schemas
            </p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedAgent}>
              <Plus className="h-4 w-4 mr-2" />
              Create Schema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Response Schema</DialogTitle>
              <DialogDescription>
                Define a new validation schema for agent responses
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schema-name">Schema Name</Label>
                  <Input
                    id="schema-name"
                    value={newSchema.name}
                    onChange={(e) => setNewSchema({ ...newSchema, name: e.target.value })}
                    placeholder="e.g., StandardResponse"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schema-version">Version</Label>
                  <Input
                    id="schema-version"
                    value={newSchema.version}
                    onChange={(e) => setNewSchema({ ...newSchema, version: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="json-schema">JSON Schema</Label>
                <Textarea
                  id="json-schema"
                  value={newSchema.jsonSchema || defaultSchemaTemplate}
                  onChange={(e) => setNewSchema({ ...newSchema, jsonSchema: e.target.value })}
                  className="h-40 font-mono text-sm"
                  placeholder="Enter JSON schema definition"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="validation-rules">Custom Validation Rules (Optional)</Label>
                <Textarea
                  id="validation-rules"
                  value={newSchema.validationRules || defaultValidationRules}
                  onChange={(e) => setNewSchema({ ...newSchema, validationRules: e.target.value })}
                  className="h-32 font-mono text-sm"
                  placeholder="Enter custom validation rules"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSchema} disabled={createSchemaMutation.isPending}>
                  {createSchemaMutation.isPending ? "Creating..." : "Create Schema"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{schemas.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Schemas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">
                {schemas.filter((s: ResponseSchema) => s.isActive).length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Active Schemas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TestTube className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
            <p className="text-xs text-muted-foreground">Validations Today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
            <p className="text-xs text-muted-foreground">Failed Validations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Response Schemas</CardTitle>
              <CardDescription>
                Manage validation schemas for agent responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-select">Select Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAgent && (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {schemasLoading ? (
                      <p className="text-center text-muted-foreground">Loading schemas...</p>
                    ) : schemas.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        No schemas found. Create one to get started.
                      </p>
                    ) : (
                      schemas.map((schema: ResponseSchema) => (
                        <Card key={schema.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium">{schema.schemaName}</h3>
                                <Badge variant={schema.isActive ? "default" : "secondary"}>
                                  v{schema.version}
                                </Badge>
                                {schema.isActive && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <div className="flex space-x-1">
                                <Button size="sm" variant="outline">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setIsTestDialogOpen(true)}
                                >
                                  <TestTube className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <Label className="text-sm font-medium">Schema Structure</Label>
                                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(schema.jsonSchema, null, 2)}
                                </pre>
                              </div>
                              
                              {Object.keys(schema.validationRules).length > 0 && (
                                <div>
                                  <Label className="text-sm font-medium">Validation Rules</Label>
                                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(schema.validationRules, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              Created: {new Date(schema.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Schema Testing</CardTitle>
              <CardDescription>
                Test response validation against schemas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-response">Test Response JSON</Label>
                <Textarea
                  id="test-response"
                  value={testResponse}
                  onChange={(e) => setTestResponse(e.target.value)}
                  className="h-32 font-mono text-sm"
                  placeholder='{"message": "Hello world", "confidence": 0.95}'
                />
              </div>
              
              <Button 
                onClick={() => handleTestValidation()}
                disabled={!selectedAgent || !testResponse || testValidationMutation.isPending}
                className="w-full"
              >
                {testValidationMutation.isPending ? "Validating..." : "Validate Response"}
              </Button>
              
              {testResults && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {testResults.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={testResults.isValid ? "text-green-600" : "text-red-600"}>
                      {testResults.isValid ? "Valid" : "Invalid"}
                    </span>
                  </div>
                  
                  {testResults.errors.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-red-600">Errors:</Label>
                      <ul className="text-sm text-red-600 list-disc list-inside mt-1">
                        {testResults.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {testResults.warnings.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-yellow-600">Warnings:</Label>
                      <ul className="text-sm text-yellow-600 list-disc list-inside mt-1">
                        {testResults.warnings.map((warning: string, index: number) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}