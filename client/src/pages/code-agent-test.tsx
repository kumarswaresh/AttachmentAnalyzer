import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Code, FileCode, CheckCircle, AlertCircle, Loader2, Play, Copy } from "lucide-react";

interface CodeGenerationResult {
  success: boolean;
  code: string;
  explanation: string;
  suggestions: string[];
  testCode?: string;
  documentation?: string;
  executionTime: number;
}

interface CodeReviewResult {
  success: boolean;
  overallScore: number;
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    line: number;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  suggestions: string[];
  securityIssues: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  performanceIssues: string[];
  bestPractices: string[];
}

export default function CodeAgentTest() {
  const [activeTab, setActiveTab] = useState("generate");
  const [generationForm, setGenerationForm] = useState({
    prompt: "",
    language: "typescript",
    agentType: "fullstack_developer",
    complexity: "intermediate",
    includeTests: true,
    includeDocumentation: true
  });
  const [reviewForm, setReviewForm] = useState({
    code: "",
    language: "typescript",
    focusAreas: []
  });
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available languages and options
  const { data: languagesData } = useQuery({
    queryKey: ["/api/code/languages"],
    retry: false
  });

  // Fetch available agents for testing
  const { data: agentsData } = useQuery({
    queryKey: ["/api/agents"],
    retry: false
  });

  // Code generation mutation
  const generateCodeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/code/generate", data);
      return await response.json();
    },
    onSuccess: (result: CodeGenerationResult) => {
      toast({
        title: "Code Generated Successfully",
        description: `Generated in ${result.executionTime}ms`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate code",
        variant: "destructive",
      });
    },
  });

  // Code review mutation
  const reviewCodeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/code/review", data);
      return await response.json();
    },
    onSuccess: (result: CodeReviewResult) => {
      toast({
        title: "Code Review Complete",
        description: `Overall score: ${result.overallScore}/100`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "Failed to review code",
        variant: "destructive",
      });
    },
  });

  // Agent code generation mutation
  const agentGenerateMutation = useMutation({
    mutationFn: async ({ agentId, prompt, context }: { agentId: string; prompt: string; context?: string }) => {
      const response = await apiRequest("POST", `/api/agents/${agentId}/generate-code`, { prompt, context });
      return await response.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: "Agent Code Generated",
        description: `${result.agentName} completed the task`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Agent Generation Failed",
        description: error.message || "Failed to generate code with agent",
        variant: "destructive",
      });
    },
  });

  const handleGenerateCode = () => {
    generateCodeMutation.mutate(generationForm);
  };

  const handleReviewCode = () => {
    reviewCodeMutation.mutate(reviewForm);
  };

  const handleAgentGenerate = () => {
    if (!selectedAgent || !generationForm.prompt) {
      toast({
        title: "Missing Information",
        description: "Please select an agent and provide a prompt",
        variant: "destructive",
      });
      return;
    }
    
    agentGenerateMutation.mutate({
      agentId: selectedAgent,
      prompt: generationForm.prompt,
      context: "Code generation test"
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Code copied successfully",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const codeAgents = agentsData?.filter((agent: any) => 
    agent.role?.includes('code') || 
    agent.role?.includes('developer') || 
    agent.role?.includes('review') ||
    agent.modules?.some((m: any) => m.moduleId?.includes('code'))
  ) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Code Agent Testing</h1>
        <p className="text-gray-600 mt-2">Test and evaluate code generation and review capabilities</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Code Generation</TabsTrigger>
          <TabsTrigger value="review">Code Review</TabsTrigger>
          <TabsTrigger value="agent-test">Agent Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Code Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={generationForm.prompt}
                    onChange={(e) => setGenerationForm(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Describe what you want to build... e.g., 'Create a user authentication system with JWT tokens'"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={generationForm.language} 
                      onValueChange={(value) => setGenerationForm(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languagesData?.available?.map((lang: any) => (
                          <SelectItem key={lang.id} value={lang.id}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="complexity">Complexity</Label>
                    <Select 
                      value={generationForm.complexity} 
                      onValueChange={(value) => setGenerationForm(prev => ({ ...prev, complexity: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languagesData?.complexityLevels?.map((level: any) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="agent-type">Agent Type</Label>
                  <Select 
                    value={generationForm.agentType} 
                    onValueChange={(value) => setGenerationForm(prev => ({ ...prev, agentType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languagesData?.agentTypes?.map((type: any) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={generationForm.includeTests}
                      onChange={(e) => setGenerationForm(prev => ({ ...prev, includeTests: e.target.checked }))}
                    />
                    <span className="text-sm">Include Tests</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={generationForm.includeDocumentation}
                      onChange={(e) => setGenerationForm(prev => ({ ...prev, includeDocumentation: e.target.checked }))}
                    />
                    <span className="text-sm">Include Documentation</span>
                  </label>
                </div>

                <Button 
                  onClick={handleGenerateCode} 
                  disabled={generateCodeMutation.isPending || !generationForm.prompt}
                  className="w-full"
                >
                  {generateCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Generate Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Result</CardTitle>
              </CardHeader>
              <CardContent>
                {generateCodeMutation.data ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-green-700 bg-green-50">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Generated in {generateCodeMutation.data.executionTime}ms
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generateCodeMutation.data.code)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>

                    <div>
                      <Label>Generated Code</Label>
                      <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto max-h-60">
                        <code>{generateCodeMutation.data.code}</code>
                      </pre>
                    </div>

                    <div>
                      <Label>Explanation</Label>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                        {generateCodeMutation.data.explanation}
                      </p>
                    </div>

                    {generateCodeMutation.data.suggestions?.length > 0 && (
                      <div>
                        <Label>Suggestions</Label>
                        <ul className="text-sm space-y-1">
                          {generateCodeMutation.data.suggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {generateCodeMutation.data.testCode && (
                      <div>
                        <Label>Test Code</Label>
                        <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto max-h-40">
                          <code>{generateCodeMutation.data.testCode}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Generate code to see results here</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Code Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="review-code">Code to Review</Label>
                  <Textarea
                    id="review-code"
                    value={reviewForm.code}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Paste your code here for review..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="review-language">Language</Label>
                  <Select 
                    value={reviewForm.language} 
                    onValueChange={(value) => setReviewForm(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languagesData?.available?.map((lang: any) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleReviewCode} 
                  disabled={reviewCodeMutation.isPending || !reviewForm.code}
                  className="w-full"
                >
                  {reviewCodeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Review Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Results</CardTitle>
              </CardHeader>
              <CardContent>
                {reviewCodeMutation.data ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {reviewCodeMutation.data.overallScore}
                        </div>
                        <div className="text-sm text-gray-500">Overall Score</div>
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${reviewCodeMutation.data.overallScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {reviewCodeMutation.data.issues?.length > 0 && (
                      <div>
                        <Label>Issues Found</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {reviewCodeMutation.data.issues.map((issue: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                              <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Line {issue.line}</span>
                                  <Badge className={getSeverityColor(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{issue.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reviewCodeMutation.data.securityIssues?.length > 0 && (
                      <div>
                        <Label>Security Issues</Label>
                        <div className="space-y-2">
                          {reviewCodeMutation.data.securityIssues.map((issue: any, index: number) => (
                            <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                <span className="font-medium text-red-800">{issue.type}</span>
                                <Badge className={getSeverityColor(issue.severity)}>
                                  {issue.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-red-700 mt-1">{issue.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reviewCodeMutation.data.suggestions?.length > 0 && (
                      <div>
                        <Label>Suggestions</Label>
                        <ul className="text-sm space-y-1">
                          {reviewCodeMutation.data.suggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Submit code for review to see results here</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agent-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Code Agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agent-select">Select Code Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent to test" />
                  </SelectTrigger>
                  <SelectContent>
                    {codeAgents.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.role}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="agent-prompt">Test Prompt</Label>
                <Textarea
                  id="agent-prompt"
                  value={generationForm.prompt}
                  onChange={(e) => setGenerationForm(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Enter a coding task for the agent to complete..."
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleAgentGenerate} 
                disabled={agentGenerateMutation.isPending || !selectedAgent || !generationForm.prompt}
                className="w-full"
              >
                {agentGenerateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Test Agent
              </Button>

              {agentGenerateMutation.data && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">
                    Agent: {agentGenerateMutation.data.agentName}
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <Label>Generated Code</Label>
                      <pre className="bg-white p-3 rounded border text-xs overflow-x-auto max-h-60">
                        <code>{agentGenerateMutation.data.code}</code>
                      </pre>
                    </div>
                    <div>
                      <Label>Explanation</Label>
                      <p className="text-sm text-gray-700">{agentGenerateMutation.data.explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}