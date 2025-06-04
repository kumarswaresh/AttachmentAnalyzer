import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Code, Sparkles, Terminal, FileCode, GitBranch } from "lucide-react";

interface CodeAgentTemplateProps {
  onUseTemplate: (templateData: any) => void;
}

const CODE_AGENT_TEMPLATES = {
  fullstack_developer: {
    name: "Full-Stack Developer Agent",
    goal: "Generate, review, and optimize full-stack web applications using modern frameworks and best practices",
    role: "Senior Full-Stack Developer",
    icon: <Code className="h-6 w-6" />,
    description: "Creates complete web applications with frontend, backend, and database components",
    specialties: ["React/Next.js", "Node.js/Express", "Database Design", "API Development"],
    modules: [
      { moduleId: "code-generation-module", version: "1.0.0", config: { language: "typescript" }, enabled: true },
      { moduleId: "file-management-module", version: "1.0.0", config: {}, enabled: true },
      { moduleId: "testing-module", version: "1.0.0", config: {}, enabled: true },
      { moduleId: "deployment-module", version: "1.0.0", config: {}, enabled: true },
    ],
    model: "claude-3-sonnet-20240229",
    guardrails: {
      requireHumanApproval: true,
      contentFiltering: true,
      readOnlyMode: false,
      maxTokens: 8000,
      allowedDomains: ["github.com", "stackoverflow.com", "npmjs.com"],
      blockedKeywords: ["malicious", "exploit", "hack"],
    }
  },
  code_reviewer: {
    name: "Code Review Agent",
    goal: "Analyze code quality, security vulnerabilities, and provide improvement suggestions",
    role: "Senior Code Reviewer",
    icon: <GitBranch className="h-6 w-6" />,
    description: "Reviews pull requests and provides detailed feedback on code quality",
    specialties: ["Security Analysis", "Performance Optimization", "Best Practices", "Documentation"],
    modules: [
      { moduleId: "code-analysis-module", version: "1.0.0", config: {}, enabled: true },
      { moduleId: "security-scan-module", version: "1.0.0", config: {}, enabled: true },
      { moduleId: "documentation-module", version: "1.0.0", config: {}, enabled: true },
    ],
    model: "claude-3-sonnet-20240229",
    guardrails: {
      requireHumanApproval: false,
      contentFiltering: true,
      readOnlyMode: true,
      maxTokens: 6000,
      allowedDomains: ["github.com", "gitlab.com"],
      blockedKeywords: [],
    }
  },
  api_builder: {
    name: "API Builder Agent",
    goal: "Design and implement RESTful APIs with comprehensive documentation and testing",
    role: "API Architect",
    icon: <Terminal className="h-6 w-6" />,
    description: "Creates scalable APIs with authentication, validation, and monitoring",
    specialties: ["REST API Design", "OpenAPI Documentation", "Authentication", "Rate Limiting"],
    modules: [
      { moduleId: "api-generation-module", version: "1.0.0", config: {}, enabled: true },
      { moduleId: "swagger-module", version: "1.0.0", config: {}, enabled: true },
      { moduleId: "testing-module", version: "1.0.0", config: {}, enabled: true },
      { moduleId: "monitoring-module", version: "1.0.0", config: {}, enabled: true },
    ],
    model: "claude-3-sonnet-20240229",
    guardrails: {
      requireHumanApproval: true,
      contentFiltering: true,
      readOnlyMode: false,
      maxTokens: 6000,
      allowedDomains: ["swagger.io", "postman.com"],
      blockedKeywords: [],
    }
  },
  debugging_assistant: {
    name: "Debugging Assistant",
    goal: "Identify and fix bugs, optimize performance, and troubleshoot issues",
    role: "Debug Specialist",
    icon: <FileCode className="h-6 w-6" />,
    description: "Analyzes error logs and provides step-by-step debugging solutions",
    specialties: ["Error Analysis", "Performance Profiling", "Log Analysis", "Testing Strategies"],
    modules: [
      { moduleId: "error-analysis-module", version: "1.0.0", config: {}, enabled: true },
      { moduleId: "logging-module", version: "1.5.0", config: {}, enabled: true },
      { moduleId: "testing-module", version: "1.0.0", config: {}, enabled: true },
    ],
    model: "claude-3-sonnet-20240229",
    guardrails: {
      requireHumanApproval: false,
      contentFiltering: true,
      readOnlyMode: true,
      maxTokens: 4000,
      allowedDomains: ["stackoverflow.com", "github.com"],
      blockedKeywords: [],
    }
  }
};

export function CodeAgentTemplate({ onUseTemplate }: CodeAgentTemplateProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("typescript");

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;

    const template = CODE_AGENT_TEMPLATES[selectedTemplate as keyof typeof CODE_AGENT_TEMPLATES];
    
    const templateData = {
      name: template.name,
      goal: customPrompt || template.goal,
      role: template.role,
      guardrails: template.guardrails,
      modules: template.modules.map(module => ({
        ...module,
        config: { ...module.config, language: selectedLanguage }
      })),
      model: template.model,
      vectorStoreId: `${template.name.toLowerCase().replace(/\s+/g, "-")}-vector-store`,
      selectedCredential: null,
      chainConfig: {
        enableChaining: false,
        parentAgents: [],
        childAgents: [],
        communicationProtocol: "message_passing",
        handoffConditions: [],
      },
    };

    onUseTemplate(templateData);
  };

  const selectedTemplateData = selectedTemplate ? 
    CODE_AGENT_TEMPLATES[selectedTemplate as keyof typeof CODE_AGENT_TEMPLATES] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Code Agent Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(CODE_AGENT_TEMPLATES).map(([key, template]) => (
              <Card 
                key={key}
                className={`cursor-pointer transition-all ${
                  selectedTemplate === key ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedTemplate(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-primary">{template.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.specialties.slice(0, 2).map((specialty) => (
                          <Badge key={specialty} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {template.specialties.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.specialties.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTemplate && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label htmlFor="language">Programming Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="csharp">C#</SelectItem>
                    <SelectItem value="golang">Go</SelectItem>
                    <SelectItem value="rust">Rust</SelectItem>
                    <SelectItem value="php">PHP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="custom-prompt">Custom Goal (Optional)</Label>
                <Textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={`Override the default goal: "${selectedTemplateData?.goal}"`}
                  rows={3}
                />
              </div>

              {selectedTemplateData && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Template Details:</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Role:</strong> {selectedTemplateData.role}</div>
                    <div><strong>Model:</strong> {selectedTemplateData.model}</div>
                    <div><strong>Modules:</strong> {selectedTemplateData.modules.length} specialized modules</div>
                    <div>
                      <strong>Specialties:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTemplateData.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleUseTemplate} className="w-full">
                Use This Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}