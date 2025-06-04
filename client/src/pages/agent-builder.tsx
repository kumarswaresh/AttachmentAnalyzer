import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleSelector } from "@/components/module-selector";
import { ModelSelector } from "@/components/model-selector";
import { RoleSelector } from "@/components/role-selector";
import { MarketingAgentTemplate } from "@/components/marketing-agent-template";
import { CodeAgentTemplate } from "@/components/code-agent-template";
import { useCreateAgent } from "@/hooks/use-agents";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Sparkles, Brain, Cog, Check, Info, Code } from "lucide-react";
import type { InsertAgent, ModuleConfig, GuardrailPolicy } from "@shared/schema";

const WIZARD_STEPS = [
  { id: 1, title: "Basic Info", description: "Name, goal, and role" },
  { id: 2, title: "Modules", description: "Select capabilities" },
  { id: 3, title: "Model Selection", description: "Choose LLM model" },
  { id: 4, title: "Agent Chaining", description: "Configure collaboration" },
  { id: 5, title: "Review", description: "Confirm and create" },
];

export default function AgentBuilder() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<{
    name: string;
    goal: string;
    role: string;
    guardrails: GuardrailPolicy;
    modules: ModuleConfig[];
    model: string;
    vectorStoreId: string;
    selectedCredential: number | null;
    chainConfig: {
      enableChaining: boolean;
      parentAgents: string[];
      childAgents: string[];
      communicationProtocol: string;
      handoffConditions: string[];
    };
  }>({
    name: "",
    goal: "",
    role: "",
    guardrails: {
      requireHumanApproval: false,
      contentFiltering: true,
      readOnlyMode: false,
      maxTokens: 4000,
      allowedDomains: [],
      blockedKeywords: [],
    },
    modules: [
      {
        moduleId: "prompt-module",
        version: "2.1.0",
        config: {},
        enabled: true,
      },
      {
        moduleId: "logging-module",
        version: "1.5.0",
        config: {},
        enabled: true,
      },
    ],
    model: "",
    vectorStoreId: "",
    selectedCredential: null,
    chainConfig: {
      enableChaining: false,
      parentAgents: [],
      childAgents: [],
      communicationProtocol: "message_passing",
      handoffConditions: [],
    },
  });

  const createAgent = useCreateAgent();

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleUseTemplate = (templateData: typeof formData) => {
    setFormData(templateData);
    setCurrentStep(4); // Jump to review step since template is pre-configured
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() && formData.goal.trim() && formData.role.trim();
      case 2:
        return formData.modules.length > 0;
      case 3:
        return formData.model.trim();
      case 4:
        return true; // Agent chaining is optional
      case 5:
        return formData.name.trim() && formData.goal.trim() && formData.role.trim() && 
               formData.modules.length > 0 && formData.model.trim();
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
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
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Agent Basic Information</CardTitle>
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
                  />
                </div>
                <div>
                  <Label htmlFor="vector-store">Vector Store ID</Label>
                  <Input
                    id="vector-store"
                    value={formData.vectorStoreId}
                    onChange={(e) => updateFormData({ vectorStoreId: e.target.value })}
                    placeholder="Auto-generated from name"
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
                />
              </div>

              <div>
                <Label>Agent Role</Label>
                <RoleSelector
                  selectedRole={formData.role}
                  onRoleChange={(role) => updateFormData({ role })}
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
                    />
                    <Label htmlFor="read-only">Read-only mode</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label htmlFor="max-tokens">Max Tokens:</Label>
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
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <ModuleSelector
            selectedModules={formData.modules}
            onModulesChange={(modules) => updateFormData({ modules })}
          />
        );

      case 3:
        return (
          <ModelSelector
            selectedModel={formData.model}
            onModelChange={(model) => updateFormData({ model })}
            selectedCredential={formData.selectedCredential}
            onCredentialChange={(credentialId) => updateFormData({ selectedCredential: credentialId })}
            useCase={formData.goal.toLowerCase().includes("marketing") ? "marketing" : 
                    formData.goal.toLowerCase().includes("release") ? "release_notes" :
                    formData.goal.toLowerCase().includes("code") ? "coding" : "general"}
          />
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Agent Chaining Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-gray-600 mb-6">
                  Configure how this agent collaborates with other agents in your system.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableChaining"
                      checked={formData.chainConfig.enableChaining}
                      onCheckedChange={(checked) => 
                        updateFormData({
                          chainConfig: { 
                            ...formData.chainConfig, 
                            enableChaining: checked as boolean 
                          }
                        })
                      }
                    />
                    <Label htmlFor="enableChaining" className="font-medium">
                      Enable Agent Chaining
                    </Label>
                  </div>

                  {formData.chainConfig.enableChaining && (
                    <>
                      <div>
                        <Label htmlFor="communicationProtocol">Communication Protocol</Label>
                        <Select
                          value={formData.chainConfig.communicationProtocol}
                          onValueChange={(value) =>
                            updateFormData({
                              chainConfig: { 
                                ...formData.chainConfig, 
                                communicationProtocol: value 
                              }
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select protocol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="message_passing">Message Passing</SelectItem>
                            <SelectItem value="event_driven">Event Driven</SelectItem>
                            <SelectItem value="callback_based">Callback Based</SelectItem>
                            <SelectItem value="pipeline">Pipeline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Handoff Conditions</Label>
                        <div className="mt-2 space-y-2">
                          {[
                            { id: "task_completion", label: "Task Completion" },
                            { id: "error_state", label: "Error State" },
                            { id: "timeout", label: "Timeout" },
                            { id: "user_approval", label: "User Approval" },
                            { id: "confidence_threshold", label: "Confidence Threshold" }
                          ].map((condition) => (
                            <div key={condition.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={condition.id}
                                checked={formData.chainConfig.handoffConditions.includes(condition.id)}
                                onCheckedChange={(checked) => {
                                  const conditions = checked
                                    ? [...formData.chainConfig.handoffConditions, condition.id]
                                    : formData.chainConfig.handoffConditions.filter(c => c !== condition.id);
                                  updateFormData({
                                    chainConfig: { 
                                      ...formData.chainConfig, 
                                      handoffConditions: conditions 
                                    }
                                  });
                                }}
                              />
                              <Label htmlFor={condition.id}>{condition.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900">Agent Collaboration</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              Agent chaining allows this agent to work with others in your system. 
                              You can configure parent and child relationships after creating the agent.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review and Create Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Basic Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Goal:</strong> {formData.goal}</p>
                  <p><strong>Role:</strong> {formData.role}</p>
                  <p><strong>Vector Store:</strong> {formData.vectorStoreId || `${formData.name.toLowerCase().replace(/\s+/g, "-")}-vector-store`}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Agent Chaining</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p><strong>Chaining:</strong> {formData.chainConfig.enableChaining ? "Enabled" : "Disabled"}</p>
                  {formData.chainConfig.enableChaining && (
                    <div className="mt-2 space-y-1">
                      <p><strong>Protocol:</strong> {formData.chainConfig.communicationProtocol}</p>
                      <p><strong>Handoff Conditions:</strong> {formData.chainConfig.handoffConditions.length} configured</p>
                    </div>
                  )}
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Agent Builder</h1>
        <p className="text-gray-600 mt-2">Create and configure new AI agents with modular components</p>
      </div>

      {/* Agent Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MarketingAgentTemplate onUseTemplate={handleUseTemplate} />
        <CodeAgentTemplate onUseTemplate={handleUseTemplate} />
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

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setLocation("/catalog")}
          >
            Cancel
          </Button>
          
          {currentStep < WIZARD_STEPS.length ? (
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
              {createAgent.isPending ? "Creating..." : "Create Agent"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
