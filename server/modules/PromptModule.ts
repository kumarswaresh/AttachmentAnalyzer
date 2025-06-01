export interface PromptModuleConfig {
  templates: Record<string, string>;
  variables: Record<string, any>;
  contextSettings: {
    maxTokens: number;
    includeHistory: boolean;
    historyLength: number;
  };
}

export class PromptModule {
  private config: PromptModuleConfig;

  constructor(config: PromptModuleConfig) {
    this.config = config;
  }

  async invoke(input: {
    templateId?: string;
    prompt?: string;
    variables?: Record<string, any>;
    context?: any[];
  }): Promise<{ processedPrompt: string; metadata: any }> {
    try {
      let prompt = input.prompt || "";
      
      // Use template if specified
      if (input.templateId && this.config.templates[input.templateId]) {
        prompt = this.config.templates[input.templateId];
      }

      // Replace variables
      const variables = { ...this.config.variables, ...input.variables };
      const processedPrompt = this.replaceVariables(prompt, variables);

      // Add context if configured
      let finalPrompt = processedPrompt;
      if (this.config.contextSettings.includeHistory && input.context) {
        const contextText = this.buildContextText(input.context);
        finalPrompt = `${contextText}\n\n${processedPrompt}`;
      }

      // Validate token length
      if (this.estimateTokens(finalPrompt) > this.config.contextSettings.maxTokens) {
        throw new Error("Processed prompt exceeds maximum token limit");
      }

      return {
        processedPrompt: finalPrompt,
        metadata: {
          templateUsed: input.templateId,
          variablesReplaced: Object.keys(variables).length,
          estimatedTokens: this.estimateTokens(finalPrompt),
          contextIncluded: this.config.contextSettings.includeHistory && input.context?.length > 0
        }
      };
    } catch (error) {
      throw new Error(`Prompt processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private replaceVariables(prompt: string, variables: Record<string, any>): string {
    let result = prompt;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = typeof value === "string" ? value : JSON.stringify(value);
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), stringValue);
    }
    
    return result;
  }

  private buildContextText(context: any[]): string {
    const maxHistory = this.config.contextSettings.historyLength;
    const relevantContext = context.slice(-maxHistory);
    
    return relevantContext
      .map((item, index) => `Context ${index + 1}: ${JSON.stringify(item)}`)
      .join("\n");
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  getSchema(): any {
    return {
      type: "object",
      properties: {
        templateId: {
          type: "string",
          description: "ID of the prompt template to use"
        },
        prompt: {
          type: "string",
          description: "Direct prompt text (alternative to templateId)"
        },
        variables: {
          type: "object",
          description: "Variables to replace in the prompt template"
        },
        context: {
          type: "array",
          description: "Context information to include"
        }
      }
    };
  }
}
