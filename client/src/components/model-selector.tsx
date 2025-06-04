import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CredentialSelector } from "@/components/credential-selector";
import { getModelSuggestions } from "@/lib/agent-api";
import type { ModelSuggestion } from "@/lib/agent-api";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  useCase?: string;
  className?: string;
  selectedCredential?: number;
  onCredentialChange?: (credentialId: number | null) => void;
}

const getCostIndicator = (cost: number) => {
  if (cost <= 2) return { label: "$", color: "bg-green-100 text-green-800" };
  if (cost <= 3) return { label: "$$", color: "bg-yellow-100 text-yellow-800" };
  return { label: "$$$", color: "bg-red-100 text-red-800" };
};

const getSpeedIndicator = (speed: number) => {
  if (speed >= 4) return { label: "Very Fast", color: "bg-green-100 text-green-800" };
  if (speed >= 3) return { label: "Fast", color: "bg-blue-100 text-blue-800" };
  return { label: "Medium", color: "bg-yellow-100 text-yellow-800" };
};

const getQualityIndicator = (quality: number) => {
  if (quality >= 4) return { label: "Excellent", color: "bg-purple-100 text-purple-800" };
  if (quality >= 3) return { label: "Good", color: "bg-blue-100 text-blue-800" };
  return { label: "Fair", color: "bg-gray-100 text-gray-800" };
};

export function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  useCase, 
  className,
  selectedCredential,
  onCredentialChange 
}: ModelSelectorProps) {
  const [suggestions, setSuggestions] = useState<ModelSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [budget, setBudget] = useState<"low" | "medium" | "high">("medium");
  const [latency, setLatency] = useState<"low" | "medium" | "high">("medium");

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!useCase) return;
      
      setIsLoading(true);
      try {
        const results = await getModelSuggestions({
          useCase,
          budget,
          latency,
        });
        setSuggestions(results);
      } catch (error) {
        console.error("Failed to fetch model suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [useCase, budget, latency]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Model Selection</CardTitle>
        
        {useCase && (
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="budget-select" className="text-sm font-medium">Budget</Label>
              <Select value={budget} onValueChange={(value: "low" | "medium" | "high") => setBudget(value)}>
                <SelectTrigger id="budget-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Cost</SelectItem>
                  <SelectItem value="medium">Medium Cost</SelectItem>
                  <SelectItem value="high">High Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="latency-select" className="text-sm font-medium">Latency</Label>
              <Select value={latency} onValueChange={(value: "low" | "medium" | "high") => setLatency(value)}>
                <SelectTrigger id="latency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Latency</SelectItem>
                  <SelectItem value="medium">Medium Latency</SelectItem>
                  <SelectItem value="high">Latency Tolerant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading suggestions...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <p>No model suggestions available</p>
            <p className="text-sm mt-1">Please provide a use case to get recommendations</p>
          </div>
        ) : (
          <RadioGroup value={selectedModel} onValueChange={onModelChange} className="space-y-4">
            {suggestions.map((model) => {
              const cost = getCostIndicator(model.cost);
              const speed = getSpeedIndicator(model.speed);
              const quality = getQualityIndicator(model.quality);
              const isRecommended = model.score > 0.8;
              
              return (
                <div
                  key={model.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedModel === model.id
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } ${isRecommended ? "ring-2 ring-green-200" : ""}`}
                >
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={model.id} className="font-medium text-gray-900 cursor-pointer">
                            {model.name}
                          </Label>
                          {isRecommended && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${cost.color}`}>
                            {cost.label}
                          </Badge>
                          <Badge className={`text-xs ${speed.color}`}>
                            {speed.label}
                          </Badge>
                          <Badge className={`text-xs ${quality.color}`}>
                            {quality.label}
                          </Badge>
                        </div>
                      </div>
                      
                      {model.description && (
                        <p className="text-sm text-gray-600 mb-3">{model.description}</p>
                      )}
                      
                      {/* Show credential selector for the selected model */}
                      {selectedModel === model.id && onCredentialChange && (
                        <div className="mt-4 pt-4 border-t">
                          <CredentialSelector
                            provider={model.provider}
                            value={selectedCredential}
                            onChange={onCredentialChange}
                            label="API Credential"
                            placeholder="Select API credential for this model"
                            required={true}
                            showCreateButton={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
}
