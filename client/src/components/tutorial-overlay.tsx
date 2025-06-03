import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, ArrowRight, ArrowLeft, Play, CheckCircle, 
  Lightbulb, Target, Zap, GitBranch, MessageSquare,
  Users, Settings, Eye, SkipForward
} from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
  code?: string;
  tips?: string[];
  nextEnabled?: boolean;
}

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Agent Chaining",
    description: "Learn how to create sophisticated multi-agent workflows using our visual builder. This guide will teach you the fundamentals of agent communication and coordination.",
    tips: [
      "Agent chaining allows multiple AI agents to work together",
      "Each agent can have specialized capabilities",
      "Communication patterns enable complex workflows"
    ]
  },
  {
    id: "basic-components",
    title: "Understanding Components",
    description: "Every workflow starts with basic components. Let's understand the different types of components available.",
    tips: [
      "AI Agents: Core processing units with specific capabilities",
      "Flow Controls: Manage workflow execution paths",
      "Data Sources: Connect to external APIs and databases",
      "Communication: Enable agent-to-agent messaging"
    ]
  },
  {
    id: "add-first-agent",
    title: "Add Your First Agent",
    description: "Click the 'Add Component' button and select an AI Agent to start building your workflow.",
    target: ".bg-green-500",
    action: "Click 'Add Component' and select 'AI Agent'",
    tips: [
      "Start with a simple agent like 'Content Generator'",
      "Each agent has configurable properties",
      "Agents can be customized for specific tasks"
    ]
  },
  {
    id: "configure-agent",
    title: "Configure Agent Properties",
    description: "Click on your agent to open the configuration panel. Here you can set the agent's name, capabilities, and behavior.",
    target: "[data-node-id]",
    tips: [
      "Give your agent a descriptive name",
      "Configure the agent's model and parameters",
      "Set appropriate prompts for the task"
    ]
  },
  {
    id: "agent-chain-component",
    title: "Agent Chain Component",
    description: "Add an Agent Chain component to coordinate multiple agents in sequence. This enables sophisticated multi-step processing.",
    action: "Add an 'Agent Chain' component from the Communication category",
    tips: [
      "Agent Chains execute agents in sequence",
      "Output from one agent becomes input to the next",
      "Perfect for multi-step content processing"
    ]
  },
  {
    id: "connect-components",
    title: "Connecting Components",
    description: "Connect your components by dragging from output ports to input ports, or use the auto-connect feature.",
    tips: [
      "Drag from an output port to an input port",
      "Auto-connect is enabled by default",
      "Use the configuration panel's 'Add Component' for auto-connection"
    ]
  },
  {
    id: "message-router",
    title: "Message Router",
    description: "Add a Message Router to intelligently route messages between agents based on content type or conditions.",
    action: "Add a 'Message Router' component",
    tips: [
      "Routes messages based on rules you define",
      "Supports conditional routing logic",
      "Essential for complex decision trees"
    ]
  },
  {
    id: "coordination-hub",
    title: "Coordination Hub",
    description: "The Coordination Hub manages complex agent interactions and maintains workflow state across multiple agents.",
    action: "Add a 'Coordination Hub' component",
    tips: [
      "Central coordination point for multiple agents",
      "Manages shared state and context",
      "Enables sophisticated orchestration patterns"
    ]
  },
  {
    id: "advanced-patterns",
    title: "Advanced Communication Patterns",
    description: "Explore advanced patterns like Broadcast, Decision Gates, and Result Aggregation for complex workflows.",
    tips: [
      "Broadcast: Send same message to multiple agents",
      "Decision Gate: Conditional workflow branching",
      "Result Aggregator: Combine outputs from multiple agents",
      "Agent Handoff: Transfer control between specialized agents"
    ]
  },
  {
    id: "test-workflow",
    title: "Testing Your Workflow",
    description: "Use the 'Test Run' button to simulate your workflow execution and see how agents communicate.",
    target: ".bg-blue-500",
    action: "Click 'Test Run' to execute your workflow",
    tips: [
      "Test runs show execution flow in real-time",
      "Check for proper message routing",
      "Verify agent responses and coordination"
    ]
  },
  {
    id: "connection-management",
    title: "Managing Connections",
    description: "Use the connection management tools to fine-tune agent communication paths.",
    tips: [
      "View all incoming and outgoing connections",
      "Disconnect specific connections selectively",
      "Clear all connections when needed",
      "Auto-connect toggle controls new component behavior"
    ]
  },
  {
    id: "undo-redo",
    title: "Undo/Redo System",
    description: "Use the undo/redo buttons to experiment freely with your workflow design.",
    target: ".border-blue-200",
    tips: [
      "50-step history for all changes",
      "Experiment without fear of losing work",
      "Perfect for iterative design processes"
    ]
  },
  {
    id: "save-workflow",
    title: "Saving Your Workflow",
    description: "Save your completed workflow to the Agent App Catalog for future use and sharing.",
    target: ".bg-purple-500",
    action: "Click 'Save App' to save your workflow",
    tips: [
      "Saved workflows appear in Agent App Catalog",
      "Can be loaded and modified later",
      "Share workflows with team members"
    ]
  },
  {
    id: "best-practices",
    title: "Best Practices",
    description: "Follow these best practices for effective agent chaining workflows.",
    tips: [
      "Start simple and add complexity gradually",
      "Use meaningful names for agents and connections",
      "Test frequently during development",
      "Document complex routing logic",
      "Consider error handling and fallback paths"
    ]
  },
  {
    id: "completion",
    title: "Tutorial Complete!",
    description: "You've learned the fundamentals of agent chaining. Start building sophisticated multi-agent workflows!",
    tips: [
      "Explore the communication components library",
      "Experiment with different agent combinations",
      "Share your workflows with the community",
      "Check the documentation for advanced features"
    ]
  }
];

export default function TutorialOverlay({ 
  isOpen, 
  onClose, 
  currentStep, 
  onStepChange, 
  onComplete 
}: TutorialOverlayProps) {
  const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
  
  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  
  useEffect(() => {
    if (step?.target) {
      setHighlightTarget(step.target);
      // Add highlight effect
      const element = document.querySelector(step.target);
      if (element) {
        element.classList.add('tutorial-highlight');
      }
    }
    
    return () => {
      // Cleanup highlight
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [step]);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      onStepChange(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
      
      {/* Tutorial card */}
      <div className="fixed top-4 right-4 w-96 z-51">
        <Card className="shadow-2xl border-2 border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">Agent Chaining Guide</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={skipTutorial}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Skip
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Step {currentStep + 1} of {tutorialSteps.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Step content */}
            <div>
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                {step.id === 'welcome' && <Target className="w-5 h-5 text-green-600" />}
                {step.id === 'completion' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {step.id.includes('agent') && <Users className="w-5 h-5 text-blue-600" />}
                {step.id.includes('component') && <Zap className="w-5 h-5 text-purple-600" />}
                {step.id.includes('connect') && <GitBranch className="w-5 h-5 text-orange-600" />}
                {step.id.includes('message') && <MessageSquare className="w-5 h-5 text-indigo-600" />}
                {step.id.includes('test') && <Play className="w-5 h-5 text-red-600" />}
                {step.id.includes('save') && <Settings className="w-5 h-5 text-gray-600" />}
                {!step.id.match(/(welcome|completion|agent|component|connect|message|test|save)/) && <Eye className="w-5 h-5 text-teal-600" />}
                {step.title}
              </h3>
              <p className="text-gray-700 leading-relaxed">{step.description}</p>
            </div>

            {/* Action instruction */}
            {step.action && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Action Required:</span>
                </div>
                <p className="text-blue-700 text-sm">{step.action}</p>
              </div>
            )}

            {/* Code example */}
            {step.code && (
              <div className="bg-gray-100 border rounded-lg p-3">
                <code className="text-sm text-gray-800">{step.code}</code>
              </div>
            )}

            {/* Tips */}
            {step.tips && step.tips.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Tips:</span>
                </div>
                <ul className="space-y-1">
                  {step.tips.map((tip, index) => (
                    <li key={index} className="text-yellow-700 text-sm flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <Badge variant="secondary" className="px-3 py-1">
                {currentStep + 1} / {tutorialSteps.length}
              </Badge>
              
              <Button
                onClick={nextStep}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {currentStep === tutorialSteps.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* CSS for highlighting */}
      <style>{`
        .tutorial-highlight {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5) !important;
          border-radius: 8px !important;
          position: relative !important;
          z-index: 40 !important;
        }
        
        .tutorial-highlight::after {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid #3B82F6;
          border-radius: 8px;
          pointer-events: none;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
      `}</style>
    </>
  );
}