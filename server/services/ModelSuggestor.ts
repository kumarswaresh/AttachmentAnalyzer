import fs from "fs";
import path from "path";

interface ModelSuggestionRequest {
  useCase: string;
  contextLength?: number;
  temperature?: number;
  budget?: "low" | "medium" | "high";
  latency?: "low" | "medium" | "high";
}

interface ModelOption {
  id: string;
  name: string;
  provider: "bedrock" | "custom";
  cost: number; // relative cost score 1-5
  speed: number; // relative speed score 1-5
  quality: number; // relative quality score 1-5
  contextLength: number;
  capabilities: string[];
  useCases: string[];
}

interface ModelSuggestion extends ModelOption {
  score: number;
  reasoning: string;
}

export class ModelSuggestor {
  private modelWeights: any;
  private models: ModelOption[];

  constructor() {
    this.loadModelWeights();
    this.initializeModels();
  }

  private loadModelWeights() {
    try {
      const weightsPath = path.join(process.cwd(), "config", "modelWeights.json");
      this.modelWeights = JSON.parse(fs.readFileSync(weightsPath, "utf8"));
    } catch (error) {
      console.warn("Could not load model weights, using defaults");
      this.modelWeights = {
        useCase: { weight: 0.4 },
        cost: { weight: 0.2 },
        speed: { weight: 0.2 },
        quality: { weight: 0.2 }
      };
    }
  }

  private initializeModels() {
    this.models = [
      {
        id: "bedrock:anthropic.claude-3-sonnet-20240229-v1:0",
        name: "Claude-3 Sonnet",
        provider: "bedrock",
        cost: 3,
        speed: 4,
        quality: 5,
        contextLength: 200000,
        capabilities: ["reasoning", "analysis", "coding", "writing"],
        useCases: ["marketing", "analysis", "recommendation", "general"]
      },
      {
        id: "bedrock:anthropic.claude-3-opus-20240229-v1:0",
        name: "Claude-3 Opus",
        provider: "bedrock",
        cost: 5,
        speed: 3,
        quality: 5,
        contextLength: 200000,
        capabilities: ["advanced_reasoning", "complex_analysis", "creative_writing", "coding"],
        useCases: ["complex_analysis", "coding", "creative_writing"]
      },
      {
        id: "bedrock:amazon.titan-text-express-v1",
        name: "Titan Text Express",
        provider: "bedrock",
        cost: 1,
        speed: 5,
        quality: 3,
        contextLength: 8000,
        capabilities: ["text_generation", "summarization"],
        useCases: ["simple_generation", "release_notes", "documentation"]
      },
      {
        id: "bedrock:amazon.titan-text-lite-v1",
        name: "Titan Text Lite",
        provider: "bedrock",
        cost: 1,
        speed: 5,
        quality: 2,
        contextLength: 4000,
        capabilities: ["basic_text_generation"],
        useCases: ["simple_generation", "basic_qa"]
      },
      {
        id: "custom:company-llm-v1",
        name: "Company LLM v1",
        provider: "custom",
        cost: 4,
        speed: 3,
        quality: 4,
        contextLength: 128000,
        capabilities: ["domain_specific", "fine_tuned", "company_context"],
        useCases: ["company_specific", "internal_docs", "domain_expert"]
      }
    ];
  }

  async suggestModels(request: ModelSuggestionRequest): Promise<ModelSuggestion[]> {
    const scoredModels = this.models.map(model => this.scoreModel(model, request));
    
    // Sort by score descending
    scoredModels.sort((a, b) => b.score - a.score);
    
    return scoredModels.slice(0, 5); // Return top 5 suggestions
  }

  private scoreModel(model: ModelOption, request: ModelSuggestionRequest): ModelSuggestion {
    let score = 0;
    let reasoning = [];

    // Use case matching
    const useCaseScore = this.calculateUseCaseScore(model, request.useCase);
    score += useCaseScore * this.modelWeights.useCase.weight;
    
    if (useCaseScore > 0.7) {
      reasoning.push(`Excellent match for ${request.useCase} use case`);
    } else if (useCaseScore > 0.4) {
      reasoning.push(`Good fit for ${request.useCase} use case`);
    }

    // Budget considerations
    if (request.budget) {
      const budgetScore = this.calculateBudgetScore(model, request.budget);
      score += budgetScore * this.modelWeights.cost.weight;
      
      if (request.budget === "low" && model.cost <= 2) {
        reasoning.push("Cost-effective choice");
      } else if (request.budget === "high" && model.cost >= 4) {
        reasoning.push("Premium model with advanced capabilities");
      }
    }

    // Latency requirements
    if (request.latency) {
      const latencyScore = this.calculateLatencyScore(model, request.latency);
      score += latencyScore * this.modelWeights.speed.weight;
      
      if (request.latency === "low" && model.speed >= 4) {
        reasoning.push("Fast response times");
      }
    }

    // Context length requirements
    if (request.contextLength) {
      if (model.contextLength >= request.contextLength) {
        score += 0.2;
        reasoning.push(`Supports required context length of ${request.contextLength} tokens`);
      } else {
        score -= 0.3;
        reasoning.push(`Limited context length (${model.contextLength} < ${request.contextLength})`);
      }
    }

    // Quality baseline
    score += (model.quality / 5) * this.modelWeights.quality.weight;

    return {
      ...model,
      score: Math.max(0, Math.min(1, score)), // Normalize to 0-1
      reasoning: reasoning.join("; ")
    };
  }

  private calculateUseCaseScore(model: ModelOption, useCase: string): number {
    const normalizedUseCase = useCase.toLowerCase();
    
    // Direct use case match
    if (model.useCases.some(uc => uc.toLowerCase().includes(normalizedUseCase))) {
      return 1.0;
    }

    // Capability match
    const capabilityMatches = {
      "marketing": ["reasoning", "analysis", "recommendation"],
      "release_notes": ["text_generation", "summarization", "documentation"],
      "coding": ["coding", "analysis"],
      "documentation": ["text_generation", "summarization"],
      "analysis": ["reasoning", "analysis", "advanced_reasoning"],
      "recommendation": ["reasoning", "recommendation"]
    };

    const relevantCapabilities = capabilityMatches[normalizedUseCase] || [];
    const matchingCapabilities = model.capabilities.filter(cap => 
      relevantCapabilities.some(rel => cap.includes(rel))
    );

    return matchingCapabilities.length / Math.max(relevantCapabilities.length, 1);
  }

  private calculateBudgetScore(model: ModelOption, budget: string): number {
    switch (budget) {
      case "low":
        return model.cost <= 2 ? 1.0 : model.cost <= 3 ? 0.5 : 0.1;
      case "medium":
        return model.cost >= 2 && model.cost <= 4 ? 1.0 : 0.5;
      case "high":
        return model.cost >= 3 ? 1.0 : 0.5;
      default:
        return 0.5;
    }
  }

  private calculateLatencyScore(model: ModelOption, latency: string): number {
    switch (latency) {
      case "low":
        return model.speed >= 4 ? 1.0 : model.speed >= 3 ? 0.6 : 0.2;
      case "medium":
        return model.speed >= 3 ? 1.0 : 0.7;
      case "high":
        return 1.0; // Any speed is acceptable
      default:
        return 0.5;
    }
  }
}
