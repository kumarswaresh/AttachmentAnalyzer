import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Play, 
  CheckCircle, 
  Settings, 
  Database, 
  Zap, 
  MessageSquare,
  BarChart3,
  FileText,
  Key,
  Bot
} from "lucide-react";

export default function DemoWorkflow() {
  const [isCreating, setIsCreating] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);
  const { toast } = useToast();

  const createDemoAgent = async () => {
    setIsCreating(true);
    try {
      const response = await apiRequest("POST", "/api/demo/create-marketing-agent");
      const result = await response.json();
      
      if (result.success) {
        setDemoResult(result);
        toast({
          title: "Demo Agent Created",
          description: "Marketing Content Specialist agent ready for testing",
        });
      } else {
        throw new Error(result.error || "Failed to create demo agent");
      }
    } catch (error: any) {
      toast({
        title: "Demo Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setIsCreating(false);
  };

  const demoSteps = [
    {
      id: 1,
      title: "Credential Setup",
      description: "Configure multiple API keys per provider",
      icon: Key,
      completed: true,
      details: [
        "Multiple OpenAI credentials with different access levels",
        "Anthropic keys for Claude model access",
        "AWS Bedrock credentials for enterprise models",
        "Secure storage with encryption and AWS Parameter Store"
      ]
    },
    {
      id: 2,
      title: "Agent Configuration",
      description: "Create specialized marketing agent",
      icon: Bot,
      completed: true,
      details: [
        "Marketing Content Specialist role definition",
        "Comprehensive system prompt for content creation",
        "Guardrails for content approval and filtering",
        "Module selection for enhanced capabilities"
      ]
    },
    {
      id: 3,
      title: "Model Assignment",
      description: "Assign specific credentials to models",
      icon: Settings,
      completed: true,
      details: [
        "GPT-4 Turbo selection for high-quality content",
        "Credential assignment during configuration",
        "Temperature and token limit optimization",
        "Cost and performance monitoring setup"
      ]
    },
    {
      id: 4,
      title: "Testing & Validation",
      description: "Execute comprehensive test scenarios",
      icon: Play,
      completed: false,
      details: [
        "Blog post creation with SEO optimization",
        "Social media campaign development",
        "Email marketing series generation",
        "Performance metrics and analytics"
      ]
    }
  ];

  const testPrompts = [
    {
      title: "Blog Post Creation",
      description: "Create comprehensive blog content with market research",
      prompt: "Create a blog post about 'The Future of Sustainable Fashion' for our eco-friendly clothing brand. Include market research insights, current trends, and 3 social media snippets for promotion.",
      expectedOutputs: [
        "1,500-2,000 word blog post with SEO optimization",
        "Market research data and trend analysis",
        "Three platform-specific social media posts",
        "Performance tracking recommendations"
      ]
    },
    {
      title: "Social Media Campaign",
      description: "Design multi-platform social media strategy",
      prompt: "Design a 7-day social media campaign for launching our new sustainable sneaker line. Include posts for Twitter, LinkedIn, and Instagram with hashtag strategies.",
      expectedOutputs: [
        "Complete 7-day content calendar",
        "Platform-specific post formats and copy",
        "Hashtag research and strategy",
        "Engagement optimization recommendations"
      ]
    },
    {
      title: "Email Marketing Series",
      description: "Create automated email welcome sequence",
      prompt: "Create a 3-email welcome series for new subscribers to our sustainable fashion newsletter. Focus on brand values, product highlights, and engagement.",
      expectedOutputs: [
        "Three email templates with compelling subject lines",
        "Progressive value delivery strategy",
        "Call-to-action optimization",
        "Segmentation and personalization recommendations"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Demo Workflow</h1>
          <p className="text-muted-foreground mt-2">
            Complete demonstration of the multi-credential agent platform
          </p>
        </div>
        <Button 
          onClick={createDemoAgent} 
          disabled={isCreating}
          size="lg"
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          {isCreating ? "Creating Demo..." : "Start Demo"}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Steps</TabsTrigger>
          <TabsTrigger value="testing">Test Scenarios</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credential Types</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">
                  OpenAI, Anthropic, AWS, Custom
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agent Modules</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  Specialized capabilities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Test Scenarios</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Comprehensive testing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Features</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">10+</div>
                <p className="text-xs text-muted-foreground">
                  Monitoring & analytics
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Demo Features Showcase</CardTitle>
              <CardDescription>
                This demonstration covers all major platform capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Multi-Credential System
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Multiple API keys per provider</li>
                    <li>• Secure credential storage and encryption</li>
                    <li>• AWS Parameter Store integration</li>
                    <li>• Credential assignment to specific agents</li>
                    <li>• Real-time validation and status monitoring</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Agent Capabilities
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Advanced content generation and optimization</li>
                    <li>• Market research and trend analysis</li>
                    <li>• Multi-platform social media strategy</li>
                    <li>• Performance tracking and analytics</li>
                    <li>• Human approval workflows and guardrails</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-6">
          <div className="space-y-4">
            {demoSteps.map((step, index) => (
              <Card key={step.id} className={step.completed ? "border-green-200 bg-green-50/50" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${step.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <step.icon className={`h-4 w-4 ${step.completed ? 'text-green-600' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Step {step.id}: {step.title}
                        </CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </div>
                    {step.completed && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className={`w-1.5 h-1.5 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <div className="space-y-6">
            {testPrompts.map((test, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{test.title}</CardTitle>
                      <CardDescription>{test.description}</CardDescription>
                    </div>
                    <Badge variant="outline">Test {index + 1}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Test Prompt:</h4>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">
                      "{test.prompt}"
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Expected Outputs:</h4>
                    <ul className="space-y-1">
                      {test.expectedOutputs.map((output, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {output}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {demoResult ? (
            <div className="space-y-6">
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    Demo Agent Created Successfully
                  </CardTitle>
                  <CardDescription>
                    Marketing Content Specialist is ready for testing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Agent Details:</h4>
                      <ul className="space-y-1 text-sm">
                        <li><strong>Name:</strong> {demoResult.agent?.name}</li>
                        <li><strong>ID:</strong> {demoResult.agent?.id}</li>
                        <li><strong>Status:</strong> <Badge variant="outline" className="text-green-600">Active</Badge></li>
                        <li><strong>Model:</strong> GPT-4 Turbo</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Assigned Credential:</h4>
                      <ul className="space-y-1 text-sm">
                        <li><strong>Name:</strong> {demoResult.credential?.name}</li>
                        <li><strong>Provider:</strong> {demoResult.credential?.provider}</li>
                        <li><strong>Type:</strong> {demoResult.credential?.keyType}</li>
                        <li><strong>Status:</strong> <Badge variant="outline" className="text-blue-600">Configured</Badge></li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Steps</CardTitle>
                  <CardDescription>Test the created agent with sample prompts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button variant="outline" className="justify-start">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Open Chat Console
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Monitoring
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Credentials
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h4 className="font-semibold mb-2">Available Test Prompts:</h4>
                      <ScrollArea className="h-32">
                        {demoResult.testPrompts?.map((prompt: any, index: number) => (
                          <div key={index} className="p-2 border rounded-lg mb-2 text-sm">
                            <strong>{prompt.title}:</strong> {prompt.prompt.substring(0, 100)}...
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Play className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No Demo Results Yet</h3>
                    <p className="text-muted-foreground">
                      Click "Start Demo" to create the marketing agent and see results here
                    </p>
                  </div>
                  <Button onClick={createDemoAgent} disabled={isCreating}>
                    {isCreating ? "Creating Demo..." : "Start Demo Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}