import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Agent } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface AgentCardProps {
  agent: Agent;
  onExecute?: (agent: Agent) => void;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onViewDetails?: (agent: Agent) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="status-indicator status-active">● Active</Badge>;
    case "idle":
      return <Badge className="status-indicator status-idle">● Idle</Badge>;
    case "error":
      return <Badge className="status-indicator status-error">● Error</Badge>;
    default:
      return <Badge className="status-indicator status-pending">● Pending</Badge>;
  }
};

const getModuleBadge = (moduleId: string) => {
  const moduleTypes = {
    "prompt-module": "core",
    "recommendation-module": "analysis", 
    "database-connector": "integration",
    "code-generator": "generation",
    "document-generation": "generation",
    "mcp-connector": "integration",
    "jira-connector": "integration",
    "template-filler": "generation",
    "logging-module": "core",
  };

  const type = moduleTypes[moduleId as keyof typeof moduleTypes] || "core";
  const displayName = moduleId.replace(/-/g, " ").replace(/module|connector/gi, "").trim();
  
  return (
    <Badge className={`module-${type} text-xs`}>
      {displayName}
    </Badge>
  );
};

const getAgentIcon = (name: string) => {
  if (name.toLowerCase().includes("marketing")) return "📈";
  if (name.toLowerCase().includes("release") || name.toLowerCase().includes("notes")) return "📝";
  if (name.toLowerCase().includes("code")) return "⌨️";
  if (name.toLowerCase().includes("data")) return "📊";
  return "🤖";
};

export function AgentCard({ agent, onExecute, onEdit, onDelete, onViewDetails }: AgentCardProps) {
  const icon = getAgentIcon(agent.name);
  const lastUpdated = formatDistanceToNow(new Date(agent.updatedAt), { addSuffix: true });

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-lg">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
              <p className="text-sm text-gray-600 truncate">{agent.id}</p>
            </div>
          </div>
          {getStatusBadge(agent.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Goal</h4>
          <p className="text-sm text-gray-600 line-clamp-2">{agent.goal}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Modules</h4>
          <div className="flex flex-wrap gap-1">
            {agent.modules.slice(0, 4).map((module) => (
              <Tooltip key={module.moduleId}>
                <TooltipTrigger asChild>
                  {getModuleBadge(module.moduleId)}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{module.moduleId} v{module.version}</p>
                  <p className="text-xs text-gray-500">
                    {module.enabled ? "Enabled" : "Disabled"}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
            {agent.modules.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{agent.modules.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            <strong>Model:</strong> {agent.model.replace("bedrock:", "").split("-")[0]}
          </span>
          <span>Updated {lastUpdated}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-4 flex space-x-2">
        <Button 
          onClick={() => onExecute?.(agent)}
          className="flex-1"
          disabled={agent.status !== "active"}
        >
          Execute
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onEdit?.(agent)}
        >
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onViewDetails?.(agent)}
        >
          Details
        </Button>
      </CardFooter>
    </Card>
  );
}
