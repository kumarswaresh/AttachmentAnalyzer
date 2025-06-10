import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, Settings, ExternalLink, Code } from "lucide-react";
import { useModuleDefinitions, useMCPCatalog } from "@/hooks/use-agents";
import type { ModuleConfig } from "@shared/schema";

interface ModuleSelectorProps {
  selectedModules: ModuleConfig[];
  onModulesChange: (modules: ModuleConfig[]) => void;
  className?: string;
  readOnly?: boolean;
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

export function ModuleSelector({ selectedModules, onModulesChange, className, readOnly = false }: ModuleSelectorProps) {
  const { data: modules = [], isLoading } = useModuleDefinitions();
  const { data: mcpCatalog = [], isLoading: mcpLoading } = useMCPCatalog();
  const [filter, setFilter] = useState<string>("all");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [configDialogOpen, setConfigDialogOpen] = useState<string | null>(null);
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, any>>({});

  const isModuleSelected = (moduleId: string) => {
    return selectedModules.some(m => m.moduleId === moduleId);
  };

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const updateModuleConfig = (moduleId: string, config: any) => {
    setModuleConfigs(prev => ({ ...prev, [moduleId]: config }));
    
    // Update the selected modules with new config
    const updatedModules = selectedModules.map(m => 
      m.moduleId === moduleId ? { ...m, config } : m
    );
    onModulesChange(updatedModules);
  };

  const toggleModule = (moduleId: string, version: string) => {
    const isSelected = isModuleSelected(moduleId);
    
    if (isSelected) {
      // Remove module
      onModulesChange(selectedModules.filter(m => m.moduleId !== moduleId));
    } else {
      // Add module with default config
      const existingConfig = moduleConfigs[moduleId] || {};
      const newModule: ModuleConfig = {
        moduleId,
        version,
        config: existingConfig,
        enabled: true,
      };
      onModulesChange([...selectedModules, newModule]);
    }
  };

  const getMCPServerInfo = (moduleId: string) => {
    return mcpCatalog.find(server => server.id === moduleId);
  };

  const filteredModules = modules.filter(module => {
    if (filter === "all") return true;
    return module.type === filter;
  });

  const moduleTypes = ["all", "core", "integration", "analysis", "generation", "mcp"];

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
          <div className="grid grid-cols-1 gap-4">
            {filteredModules.map((module) => {
              const isSelected = isModuleSelected(module.id);
              const isRequired = module.id === "prompt-module" || module.id === "logging-module";
              const isExpanded = expandedModules.has(module.id);
              const mcpInfo = getMCPServerInfo(module.id);
              
              return (
                <div key={module.id} className="space-y-2">
                  <div
                    className={`border rounded-lg p-4 transition-colors ${
                      isSelected 
                        ? "border-blue-300 bg-blue-50" 
                        : "border-gray-200 hover:border-gray-300"
                    } ${isRequired ? "opacity-75" : ""}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={isSelected || isRequired}
                        onCheckedChange={() => !isRequired && !readOnly && toggleModule(module.id, module.version)}
                        disabled={isRequired || readOnly}
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
                          {mcpInfo && (
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                              MCP Server
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {module.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
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
                          
                          <div className="flex items-center space-x-2">
                            {isSelected && (
                              <Dialog open={configDialogOpen === module.id} onOpenChange={(open) => setConfigDialogOpen(open ? module.id : null)}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Settings className="w-3 h-3 mr-1" />
                                    Configure
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Configure {module.name}</DialogTitle>
                                  </DialogHeader>
                                  <ModuleConfigForm 
                                    module={module} 
                                    mcpInfo={mcpInfo}
                                    config={moduleConfigs[module.id] || {}}
                                    onConfigChange={(config) => updateModuleConfig(module.id, config)}
                                  />
                                </DialogContent>
                              </Dialog>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleModuleExpansion(module.id)}
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent>
                      <div className="ml-8 mr-4 p-4 bg-gray-50 rounded-lg border">
                        <ModuleDetails module={module} mcpInfo={mcpInfo} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for displaying detailed module information
function ModuleDetails({ module, mcpInfo }: { module: any; mcpInfo: any }) {
  return (
    <div className="space-y-4">
      <div>
        <h5 className="font-medium text-gray-900 mb-2">Module Information</h5>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Type:</span>
            <span className="ml-2 font-medium">{module.type}</span>
          </div>
          <div>
            <span className="text-gray-600">Version:</span>
            <span className="ml-2 font-medium">v{module.version}</span>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <span className="ml-2 font-medium">{module.status}</span>
          </div>
          {module.dependencies && module.dependencies.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-600">Dependencies:</span>
              <span className="ml-2 font-medium">{module.dependencies.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {mcpInfo && (
        <div>
          <h5 className="font-medium text-gray-900 mb-2 flex items-center">
            <Code className="w-4 h-4 mr-1" />
            MCP Server Details
          </h5>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600">Description:</span>
              <p className="text-sm mt-1">{mcpInfo.description}</p>
            </div>
            
            {mcpInfo.endpoints && mcpInfo.endpoints.length > 0 && (
              <div>
                <span className="text-gray-600">Available Endpoints:</span>
                <div className="mt-1 space-y-1">
                  {mcpInfo.endpoints.map((endpoint: any, index: number) => (
                    <div key={index} className="flex items-center text-sm bg-gray-100 rounded px-2 py-1">
                      <Badge variant="outline" className="mr-2 text-xs">
                        {endpoint.method}
                      </Badge>
                      <code className="text-xs">{endpoint.path}</code>
                      {endpoint.description && (
                        <span className="ml-2 text-gray-600">- {endpoint.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mcpInfo.callbacks && mcpInfo.callbacks.length > 0 && (
              <div>
                <span className="text-gray-600">Callbacks:</span>
                <div className="mt-1 space-y-1">
                  {mcpInfo.callbacks.map((callback: any, index: number) => (
                    <div key={index} className="text-sm bg-blue-50 rounded px-2 py-1">
                      <code className="text-xs">{callback.name}</code>
                      {callback.description && (
                        <span className="ml-2 text-gray-600">- {callback.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mcpInfo.configuration && (
              <div>
                <span className="text-gray-600">Configuration Options:</span>
                <div className="mt-1 text-sm bg-gray-100 rounded p-2">
                  <pre className="text-xs">{JSON.stringify(mcpInfo.configuration, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Component for configuring module settings
function ModuleConfigForm({ 
  module, 
  mcpInfo, 
  config, 
  onConfigChange 
}: { 
  module: any; 
  mcpInfo: any; 
  config: any; 
  onConfigChange: (config: any) => void; 
}) {
  const [localConfig, setLocalConfig] = useState(config);

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Basic Configuration</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="enabled">Enable Module</Label>
            <Checkbox
              id="enabled"
              checked={localConfig.enabled !== false}
              onCheckedChange={(checked) => updateConfig('enabled', checked)}
            />
          </div>
          
          <div>
            <Label htmlFor="timeout">Timeout (seconds)</Label>
            <Input
              id="timeout"
              type="number"
              value={localConfig.timeout || 30}
              onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
              placeholder="30"
            />
          </div>
        </div>
      </div>

      {mcpInfo && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Settings className="w-4 h-4 mr-1" />
            MCP Server Configuration
          </h4>
          <div className="space-y-4">
            {mcpInfo.configuration && Object.entries(mcpInfo.configuration).map(([key, setting]: [string, any]) => (
              <div key={key}>
                <Label htmlFor={key}>{setting.label || key}</Label>
                {setting.type === 'string' && (
                  <Input
                    id={key}
                    value={localConfig[key] || setting.default || ''}
                    onChange={(e) => updateConfig(key, e.target.value)}
                    placeholder={setting.placeholder}
                  />
                )}
                {setting.type === 'number' && (
                  <Input
                    id={key}
                    type="number"
                    value={localConfig[key] || setting.default || 0}
                    onChange={(e) => updateConfig(key, parseInt(e.target.value))}
                    placeholder={setting.placeholder}
                  />
                )}
                {setting.type === 'boolean' && (
                  <Checkbox
                    id={key}
                    checked={localConfig[key] !== undefined ? localConfig[key] : setting.default}
                    onCheckedChange={(checked) => updateConfig(key, checked)}
                  />
                )}
                {setting.type === 'textarea' && (
                  <Textarea
                    id={key}
                    value={localConfig[key] || setting.default || ''}
                    onChange={(e) => updateConfig(key, e.target.value)}
                    placeholder={setting.placeholder}
                    rows={3}
                  />
                )}
                {setting.description && (
                  <p className="text-xs text-gray-600 mt-1">{setting.description}</p>
                )}
              </div>
            ))}

            <div>
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input
                id="api-endpoint"
                value={localConfig.apiEndpoint || mcpInfo.defaultEndpoint || ''}
                onChange={(e) => updateConfig('apiEndpoint', e.target.value)}
                placeholder={mcpInfo.defaultEndpoint}
              />
            </div>

            <div>
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={localConfig.apiKey || ''}
                onChange={(e) => updateConfig('apiKey', e.target.value)}
                placeholder="Enter API key if required"
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Advanced Settings</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="custom-config">Custom Configuration (JSON)</Label>
            <Textarea
              id="custom-config"
              value={JSON.stringify(localConfig.customConfig || {}, null, 2)}
              onChange={(e) => {
                try {
                  const customConfig = JSON.parse(e.target.value);
                  updateConfig('customConfig', customConfig);
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='{"key": "value"}'
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
