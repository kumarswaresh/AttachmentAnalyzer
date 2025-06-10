import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleSelector } from "@/components/module-selector";
import { RoleSelector } from "@/components/role-selector";
import { MarketingAgentTemplate } from "@/components/marketing-agent-template";
import { CodeAgentTemplate } from "@/components/code-agent-template";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Plus, FileText, Copy, Check } from "lucide-react";
import type { Agent, InsertAgent, AgentTemplate } from "@shared/schema";

interface ModuleConfig {
  moduleId: string;
  version: string;
  config: Record<string, any>;
}

interface GuardrailPolicy {
  requireHumanApproval: boolean;
  contentFiltering: boolean;
  readOnlyMode: boolean;
  maxTokens: number;
}

interface FormData {
  name: string;
  goal: string;
  role: string;
  guardrails: GuardrailPolicy;
  modules: ModuleConfig[];
  model: string;
  vectorStoreId: string;
}

const WIZARD_STEPS = [
  { id: 1, title: "Basic Info", description: "Name and purpose" },
  { id: 2, title: "Modules", description: "Select capabilities" },
  { id: 3, title: "Review", description: "Confirm settings" },
];

export default function AgentBuilder() {
  const [currentStep, setCurrentStep] = useState(0);
  const [builderMode, setBuilderMode] = useState<'new' | 'template' | 'existing' | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Parse URL parameters for view/edit modes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    const editId = urlParams.get('edit');

    if (viewId) {
      setIsViewMode(true);
      setEditingAgentId(parseInt(viewId));
      setBuilderMode('existing');
      setCurrentStep(1); // Skip selection step
    } else if (editId) {
      setIsViewMode(false);
      setEditingAgentId(parseInt(editId));
      setBuilderMode('existing');
      setCurrentStep(1); // Skip selection step
    }
  }, []);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    goal: "",
    role: "assistant",
    guardrails: {
      requireHumanApproval: false,
      contentFiltering: true,
      readOnlyMode: false,
      maxTokens: 4000,
    },
    modules: [],
    model: "gpt-4",
    vectorStoreId: "",
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/agent-templates"],
  });

  // Fetch existing agents
  const { data: existingAgents = [] } = useQuery({
    queryKey: ["/api/agents"],
  });

  // Fetch specific agent data for view/edit mode
  const { data: agentData } = useQuery({
    queryKey: [`/api/agents/${editingAgentId}`],
    enabled: !!editingAgentId,
  });

  // Populate form data when agent data is loaded
  useEffect(() => {
    if (agentData && editingAgentId) {
      setFormData({
        name: agentData.name || "",
        goal: agentData.goal || "",
        role: agentData.role || "assistant",
        guardrails: agentData.guardrails || {
          requireHumanApproval: false,
          contentFiltering: true,
          readOnlyMode: false,
          maxTokens: 4000,
        },
        modules: agentData.modules || [],
        model: agentData.model || "gpt-4",
        vectorStoreId: agentData.vectorStoreId || "",
      });
    }
  }, [agentData, editingAgentId]);

  const createAgent = useMutation({
    mutationFn: async (agentData: InsertAgent) => {
      if (editingAgentId && !isViewMode) {
        return apiRequest("PUT", `/api/agents/${editingAgentId}`, agentData);
      } else {
        return apiRequest("POST", "/api/agents", agentData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", editingAgentId] });
      setLocation("/agent-catalog");
    },
  });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleUseTemplate = (template: any) => {
    setFormData({
      name: template.name,
      goal: template.goal,
      role: template.role,
      guardrails: template.guardrails,
      modules: template.modules || [],
      model: template.model,
      vectorStoreId: template.vectorStoreId || `${template.name.toLowerCase().replace(/\s+/g, "-")}-vector-store`,
    });
    setCurrentStep(1);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.name && formData.goal && formData.role);
      case 2:
        return formData.modules.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const agentData: InsertAgent = {
        name: formData.name,
        goal: formData.goal,
        role: formData.role,
        guardrails: formData.guardrails,
        modules: formData.modules,
        model: formData.model,
        vectorStoreId: formData.vectorStoreId || `${formData.name.toLowerCase().replace(/\s+/g, "-")}-vector-store`,
        status: "active",
      };

      await createAgent.mutateAsync(agentData);
      setLocation("/");
    } catch (error) {
      console.error("Failed to create agent:", error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">Create Your Agent</h1>
              <p className="text-lg text-gray-600">Choose how you'd like to build your agent</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Create New Agent */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                  builderMode === 'new' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => {
                  setBuilderMode('new');
                  setCurrentStep(1);
                }}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Create New Agent</CardTitle>
                  <CardDescription className="text-center">
                    Build a completely new agent from scratch with custom configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Full customization</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Step-by-step wizard</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Advanced configuration</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Use Template */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                  builderMode === 'template' ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
                onClick={() => {
                  setBuilderMode('template');
                }}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Use Template</CardTitle>
                  <CardDescription className="text-center">
                    Start with a pre-built template and customize as needed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Quick setup</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Best practices included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Industry-specific</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clone Existing */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                  builderMode === 'existing' ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                }`}
                onClick={() => {
                  setBuilderMode('existing');
                }}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Copy className="w-8 h-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Clone Existing</CardTitle>
                  <CardDescription className="text-center">
                    Duplicate and modify an existing agent configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Proven configurations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Easy modifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Performance history</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Template Selection */}
            {builderMode === 'template' && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Choose Template</CardTitle>
                  <CardDescription>Select a template to start with</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.length > 0 ? templates.map((template: any) => (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          handleUseTemplate(template);
                        }}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Badge variant="outline">{template.category}</Badge>
                        </CardContent>
                      </Card>
                    )) : (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        No templates available. Create a new agent instead.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing Agent Selection */}
            {builderMode === 'existing' && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Choose Agent to Clone</CardTitle>
                  <CardDescription>Select an existing agent to duplicate and modify</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {existingAgents.length > 0 ? existingAgents.map((agent: any) => (
                      <Card 
                        key={agent.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          const agentData = {
                            name: `${agent.name} (Copy)`,
                            goal: agent.goal,
                            role: agent.role,
                            guardrails: agent.guardrails,
                            modules: agent.modules || [],
                            model: agent.model,
                            vectorStoreId: `${agent.name.toLowerCase().replace(/\s+/g, "-")}-copy-vector-store`,
                          };
                          handleUseTemplate(agentData);
                        }}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <CardDescription>{agent.goal}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                              {agent.status}
                            </Badge>
                            <span className="text-sm text-gray-500">{agent.role}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )) : (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        No existing agents found. Create a new agent instead.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>
                {isViewMode ? "Agent Details (View Only)" : editingAgentId ? "Edit Agent" : "Agent Basic Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    placeholder="e.g., Customer Support Agent"
                    readOnly={isViewMode}
                  />
                </div>
                <div>
                  <Label htmlFor="vector-store">Vector Store ID</Label>
                  <Input
                    id="vector-store"
                    value={formData.vectorStoreId}
                    onChange={(e) => updateFormData({ vectorStoreId: e.target.value })}
                    placeholder="Auto-generated from name"
                    readOnly={isViewMode}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="goal">Goal Description</Label>
                <Textarea
                  id="goal"
                  value={formData.goal}
                  onChange={(e) => updateFormData({ goal: e.target.value })}
                  placeholder="Describe what this agent should accomplish..."
                  rows={3}
                  readOnly={isViewMode}
                />
              </div>

              <div>
                <Label>Agent Role</Label>
                <RoleSelector
                  selectedRole={formData.role}
                  onRoleChange={(role) => updateFormData({ role })}
                  readOnly={isViewMode}
                />
              </div>

              <div>
                <Label className="text-base font-medium">Guardrails</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="human-approval"
                      checked={formData.guardrails.requireHumanApproval}
                      onCheckedChange={(checked) =>
                        updateFormData({
                          guardrails: {
                            ...formData.guardrails,
                            requireHumanApproval: checked as boolean,
                          },
                        })
                      }
                      disabled={isViewMode}
                    />
                    <Label htmlFor="human-approval">Require human approval</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="content-filtering"
                      checked={formData.guardrails.contentFiltering}
                      onCheckedChange={(checked) =>
                        updateFormData({
                          guardrails: {
                            ...formData.guardrails,
                            contentFiltering: checked as boolean,
                          },
                        })
                      }
                      disabled={isViewMode}
                    />
                    <Label htmlFor="content-filtering">Enable content filtering</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="read-only"
                      checked={formData.guardrails.readOnlyMode}
                      onCheckedChange={(checked) =>
                        updateFormData({
                          guardrails: {
                            ...formData.guardrails,
                            readOnlyMode: checked as boolean,
                          },
                        })
                      }
                      disabled={isViewMode}
                    />
                    <Label htmlFor="read-only">Read-only mode</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      value={formData.guardrails.maxTokens}
                      onChange={(e) =>
                        updateFormData({
                          guardrails: {
                            ...formData.guardrails,
                            maxTokens: parseInt(e.target.value) || 4000,
                          },
                        })
                      }
                      min={100}
                      readOnly={isViewMode}
                      max={8000}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="model">AI Model</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) => updateFormData({ model: value })}
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Module Selection</CardTitle>
              <CardDescription>
                Choose modules to enhance your agent's capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModuleSelector
                selectedModules={formData.modules}
                onModulesChange={(modules) => updateFormData({ modules })}
                readOnly={isViewMode}
              />
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review Configuration</CardTitle>
              <CardDescription>
                Review your agent configuration before creating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Basic Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Goal:</strong> {formData.goal}</p>
                  <p><strong>Role:</strong> {formData.role}</p>
                  <p><strong>Vector Store ID:</strong> {formData.vectorStoreId}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Guardrails</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {formData.guardrails.requireHumanApproval && (
                      <Badge variant="outline">Requires Human Approval</Badge>
                    )}
                    {formData.guardrails.contentFiltering && (
                      <Badge variant="outline">Content Filtering</Badge>
                    )}
                    {formData.guardrails.readOnlyMode && (
                      <Badge variant="outline">Read-Only Mode</Badge>
                    )}
                    <Badge variant="outline">Max Tokens: {formData.guardrails.maxTokens}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Selected Modules ({formData.modules.length})</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {formData.modules.map((module) => (
                      <Badge key={module.moduleId} className="module-core">
                        {module.moduleId.replace(/-/g, " ").replace(/module|connector/gi, "").trim()}
                        <span className="ml-1 text-xs opacity-75">v{module.version}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Model Configuration</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p><strong>Selected Model:</strong> {formData.model || "None selected"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Only show header and progress for steps 1+ */}
      {currentStep > 0 && (
        <>
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Builder</h1>
            <p className="text-gray-600 mt-2">Create and configure new AI agents with modular components</p>
          </div>

          {/* Progress Steps */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {WIZARD_STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          currentStep >= step.id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {step.id}
                      </div>
                      <div className="text-sm">
                        <div className={`font-medium ${currentStep >= step.id ? "text-blue-600" : "text-gray-600"}`}>
                          {step.title}
                        </div>
                        <div className="text-gray-500">{step.description}</div>
                      </div>
                    </div>
                    
                    {index < WIZARD_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.id ? "bg-blue-600" : "bg-gray-200"}`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation - only show for steps 1+ */}
      {currentStep > 0 && (
        <div className="flex justify-between">
          {!isViewMode && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
          )}

          <div className={`flex space-x-3 ${isViewMode ? 'ml-auto' : ''}`}>
            <Button
              variant="outline"
              onClick={() => setLocation("/agent-catalog")}
            >
              {isViewMode ? "Back to Catalog" : "Cancel"}
            </Button>
            
            {isViewMode ? (
              <Button
                onClick={() => setLocation(`/agent-builder?edit=${editingAgentId}`)}
              >
                Edit Agent
              </Button>
            ) : currentStep < WIZARD_STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || createAgent.isPending}
              >
                {createAgent.isPending ? 
                  (editingAgentId ? "Updating..." : "Creating...") : 
                  (editingAgentId ? "Update Agent" : "Create Agent")
                }
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}