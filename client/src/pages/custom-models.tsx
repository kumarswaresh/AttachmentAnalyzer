import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Trash2, TestTube, Plus } from "lucide-react";

interface CustomModel {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  requestFormat: string;
  responseMapping: {
    contentPath: string;
    errorPath?: string;
  };
}

export default function CustomModels() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [testModel, setTestModel] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState("Hello, how are you?");

  const { data: customModels = [], isLoading } = useQuery({
    queryKey: ["/api/custom-models"],
  });

  const addModel = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/custom-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add model");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-models"] });
      setShowAddForm(false);
      toast({ title: "Success", description: "Custom model added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add custom model", variant: "destructive" });
    },
  });

  const deleteModel = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/custom-models/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete model");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-models"] });
      toast({ title: "Success", description: "Custom model removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove custom model", variant: "destructive" });
    },
  });

  const testModelMutation = useMutation({
    mutationFn: async ({ id, prompt }: { id: string; prompt: string }) => {
      const response = await fetch(`/api/custom-models/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error("Model test failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Test Successful", 
        description: `Response: ${data.response.substring(0, 100)}...` 
      });
      setTestModel(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Test Failed", 
        description: error.message || "Model test failed", 
        variant: "destructive" 
      });
    },
  });

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const model = {
      id: formData.get("id") as string,
      name: formData.get("name") as string,
      provider: formData.get("provider") as string,
      endpoint: formData.get("endpoint") as string,
      apiKey: formData.get("apiKey") as string || undefined,
      requestFormat: formData.get("requestFormat") as string,
      responseMapping: {
        contentPath: formData.get("contentPath") as string,
        errorPath: formData.get("errorPath") as string || undefined,
      },
      parameters: {
        maxTokens: parseInt(formData.get("maxTokens") as string) || 4000,
        temperature: parseFloat(formData.get("temperature") as string) || 0.7,
      },
    };

    addModel.mutate(model);
  };

  if (isLoading) {
    return <div className="p-6">Loading custom models...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Custom Models</h1>
          <p className="text-muted-foreground">
            Add and manage your own LLM models alongside AWS Bedrock and OpenAI
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Model
        </Button>
      </div>

      {/* Add Model Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Custom Model</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddModel} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id">Model ID</Label>
                  <Input 
                    id="id" 
                    name="id" 
                    placeholder="my-custom-model" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="My Custom Model" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Input 
                    id="provider" 
                    name="provider" 
                    placeholder="ollama, huggingface, etc." 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="requestFormat">Request Format</Label>
                  <Select name="requestFormat" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI Compatible</SelectItem>
                      <SelectItem value="anthropic">Anthropic Compatible</SelectItem>
                      <SelectItem value="custom">Custom Format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="endpoint">API Endpoint</Label>
                <Input 
                  id="endpoint" 
                  name="endpoint" 
                  placeholder="https://api.example.com/v1/chat/completions" 
                  required 
                />
              </div>

              <div>
                <Label htmlFor="apiKey">API Key (Optional)</Label>
                <Input 
                  id="apiKey" 
                  name="apiKey" 
                  type="password"
                  placeholder="Your API key if required" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contentPath">Response Content Path</Label>
                  <Input 
                    id="contentPath" 
                    name="contentPath" 
                    placeholder="choices.0.message.content" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="errorPath">Error Path (Optional)</Label>
                  <Input 
                    id="errorPath" 
                    name="errorPath" 
                    placeholder="error.message" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input 
                    id="maxTokens" 
                    name="maxTokens" 
                    type="number" 
                    defaultValue="4000" 
                  />
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input 
                    id="temperature" 
                    name="temperature" 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="2" 
                    defaultValue="0.7" 
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={addModel.isPending}>
                  {addModel.isPending ? "Adding..." : "Add Model"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Models List */}
      <div className="grid gap-4">
        {customModels.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No custom models configured yet. Add your first custom model to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          customModels.map((model: CustomModel) => (
            <Card key={model.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{model.name}</h3>
                      <Badge variant="secondary">{model.provider}</Badge>
                      <Badge variant="outline">{model.requestFormat}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">ID: {model.id}</p>
                    <p className="text-sm text-muted-foreground">Endpoint: {model.endpoint}</p>
                    <p className="text-sm text-muted-foreground">
                      Response Path: {model.responseMapping.contentPath}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTestModel(model.id)}
                      disabled={testModelMutation.isPending}
                    >
                      <TestTube className="w-4 h-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteModel.mutate(model.id)}
                      disabled={deleteModel.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {testModel === model.id && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="testPrompt">Test Prompt</Label>
                    <Textarea
                      id="testPrompt"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      placeholder="Enter a test prompt..."
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => testModelMutation.mutate({ id: model.id, prompt: testPrompt })}
                        disabled={testModelMutation.isPending}
                      >
                        {testModelMutation.isPending ? "Testing..." : "Run Test"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestModel(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}