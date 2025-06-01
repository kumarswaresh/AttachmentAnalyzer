import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useModuleDefinitions } from "@/hooks/use-agents";
import type { ModuleConfig } from "@shared/schema";

interface ModuleSelectorProps {
  selectedModules: ModuleConfig[];
  onModulesChange: (modules: ModuleConfig[]) => void;
  className?: string;
}

const getModuleIcon = (type: string) => {
  switch (type) {
    case "core": return "🔧";
    case "integration": return "🔗";
    case "analysis": return "📊";
    case "generation": return "✨";
    default: return "📦";
  }
};

const getModuleBadgeClass = (type: string) => {
  switch (type) {
    case "core": return "module-core";
    case "integration": return "module-integration";
    case "analysis": return "module-analysis";
    case "generation": return "module-generation";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "stable": return "bg-green-100 text-green-800";
    case "beta": return "bg-yellow-100 text-yellow-800";
    case "deprecated": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export function ModuleSelector({ selectedModules, onModulesChange, className }: ModuleSelectorProps) {
  const { data: modules = [], isLoading } = useModuleDefinitions();
  const [filter, setFilter] = useState<string>("all");

  const isModuleSelected = (moduleId: string) => {
    return selectedModules.some(m => m.moduleId === moduleId);
  };

  const toggleModule = (moduleId: string, version: string) => {
    const isSelected = isModuleSelected(moduleId);
    
    if (isSelected) {
      // Remove module
      onModulesChange(selectedModules.filter(m => m.moduleId !== moduleId));
    } else {
      // Add module with default config
      const newModule: ModuleConfig = {
        moduleId,
        version,
        config: {},
        enabled: true,
      };
      onModulesChange([...selectedModules, newModule]);
    }
  };

  const filteredModules = modules.filter(module => {
    if (filter === "all") return true;
    return module.type === filter;
  });

  const moduleTypes = ["all", "core", "integration", "analysis", "generation"];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading modules...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Select Modules</CardTitle>
        <div className="flex flex-wrap gap-2">
          {moduleTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filter === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredModules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <p>No modules found</p>
            <p className="text-sm mt-1">Try selecting a different filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModules.map((module) => {
              const isSelected = isModuleSelected(module.id);
              const isRequired = module.id === "prompt-module" || module.id === "logging-module";
              
              return (
                <div
                  key={module.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    isSelected 
                      ? "border-blue-300 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  } ${isRequired ? "opacity-75" : ""}`}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={isSelected || isRequired}
                      onCheckedChange={() => !isRequired && toggleModule(module.id, module.version)}
                      disabled={isRequired}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getModuleIcon(module.type)}</span>
                        <h4 className="font-medium text-gray-900">{module.name}</h4>
                        <Badge className={getModuleBadgeClass(module.type)}>
                          {module.type}
                        </Badge>
                        {isRequired && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {module.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>v{module.version}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={getStatusBadgeClass(module.status)}>
                              {module.status}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Module Status: {module.status}</p>
                            {module.dependencies && module.dependencies.length > 0 && (
                              <p className="text-xs">
                                Dependencies: {module.dependencies.join(", ")}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
