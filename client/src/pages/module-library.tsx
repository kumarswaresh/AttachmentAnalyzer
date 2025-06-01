import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  category: 'data' | 'integration' | 'automation' | 'processing' | 'communication';
  version: string;
  capabilities: string[];
  requiredSecrets?: string[];
  configSchema: any;
}

const categoryColors = {
  data: "bg-blue-100 text-blue-800",
  integration: "bg-green-100 text-green-800", 
  automation: "bg-purple-100 text-purple-800",
  processing: "bg-orange-100 text-orange-800",
  communication: "bg-pink-100 text-pink-800",
};

export default function ModuleLibrary() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<ModuleInfo | null>(null);
  const [testConfig, setTestConfig] = useState<string>("");
  const [testInput, setTestInput] = useState<string>("");
  const { toast } = useToast();

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["/api/modules", selectedCategory !== "all" ? { category: selectedCategory } : {}],
  });

  const testModuleMutation = useMutation({
    mutationFn: async ({ moduleId, config, input }: { moduleId: string; config: any; input: any }) => {
      return await apiRequest("POST", `/api/modules/${moduleId}/test`, { config, input });
    },
    onSuccess: (result) => {
      toast({
        title: "Module Test Successful",
        description: `Module executed successfully. Check the results below.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Module Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestModule = () => {
    if (!selectedModule) return;

    try {
      const config = testConfig ? JSON.parse(testConfig) : {};
      const input = testInput ? JSON.parse(testInput) : {};
      
      testModuleMutation.mutate({
        moduleId: selectedModule.id,
        config,
        input,
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your configuration and input JSON format.",
        variant: "destructive",
      });
    }
  };

  const categories = ["all", "data", "integration", "automation", "processing", "communication"];

  const filteredModules = selectedCategory === "all" 
    ? modules 
    : modules.filter((module: ModuleInfo) => module.category === selectedCategory);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Specialized Module Library</h1>
        <p className="text-gray-600 mb-6">
          Browse and test specialized modules for API connections, file processing, data transformation, and workflow automation.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category === "all" ? "All Categories" : category}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module: ModuleInfo) => (
          <Card key={module.id} className="h-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{module.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={categoryColors[module.category]}>
                      {module.category}
                    </Badge>
                    <Badge variant="outline">v{module.version}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {module.description}
              </p>

              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Capabilities:</h4>
                <div className="flex flex-wrap gap-1">
                  {module.capabilities.slice(0, 3).map((capability, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                  {module.capabilities.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{module.capabilities.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {module.requiredSecrets && module.requiredSecrets.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Required Secrets:</h4>
                  <div className="flex flex-wrap gap-1">
                    {module.requiredSecrets.map((secret, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {secret}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    onClick={() => setSelectedModule(module)}
                  >
                    Test Module
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Test {module.name}</DialogTitle>
                  </DialogHeader>

                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="config">Configuration</TabsTrigger>
                      <TabsTrigger value="test">Test</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Description</h3>
                        <p className="text-sm text-gray-600">{module.description}</p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">All Capabilities</h3>
                        <div className="flex flex-wrap gap-2">
                          {module.capabilities.map((capability, index) => (
                            <Badge key={index} variant="secondary">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {module.requiredSecrets && module.requiredSecrets.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-2">Required Environment Variables</h3>
                          <div className="bg-gray-50 p-3 rounded">
                            {module.requiredSecrets.map((secret, index) => (
                              <div key={index} className="font-mono text-sm">
                                {secret}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="config" className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Configuration Schema</h3>
                        <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto">
                          {JSON.stringify(module.configSchema, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <Label htmlFor="test-config">Configuration JSON</Label>
                        <Textarea
                          id="test-config"
                          placeholder="Enter module configuration as JSON..."
                          value={testConfig}
                          onChange={(e) => setTestConfig(e.target.value)}
                          className="h-32 font-mono text-sm"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="test" className="space-y-4">
                      <div>
                        <Label htmlFor="test-input">Test Input JSON</Label>
                        <Textarea
                          id="test-input"
                          placeholder="Enter test input data as JSON..."
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                          className="h-32 font-mono text-sm"
                        />
                      </div>

                      <Button 
                        onClick={handleTestModule}
                        disabled={testModuleMutation.isPending}
                        className="w-full"
                      >
                        {testModuleMutation.isPending ? "Testing..." : "Run Test"}
                      </Button>

                      {testModuleMutation.data && (
                        <div>
                          <h3 className="font-medium mb-2">Test Results</h3>
                          <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto max-h-64">
                            {JSON.stringify(testModuleMutation.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {testModuleMutation.error && (
                        <div>
                          <h3 className="font-medium mb-2 text-red-600">Error</h3>
                          <div className="bg-red-50 p-4 rounded text-sm text-red-700">
                            {testModuleMutation.error.message}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No modules found in this category.</p>
        </div>
      )}
    </div>
  );
}