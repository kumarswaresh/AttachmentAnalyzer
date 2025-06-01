import axios from 'axios';

export interface CustomModelConfig {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  requestFormat: 'openai' | 'anthropic' | 'custom';
  responseMapping: {
    contentPath: string;
    errorPath?: string;
  };
  parameters: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  };
}

export class CustomModelRegistry {
  private models: Map<string, CustomModelConfig> = new Map();

  constructor() {
    this.initializeDefaultModels();
  }

  private initializeDefaultModels() {
    // Ollama local deployment
    this.registerModel({
      id: 'local-ollama-llama2',
      name: 'Llama 2 (Ollama)',
      provider: 'ollama',
      endpoint: 'http://localhost:11434/api/generate',
      requestFormat: 'custom',
      responseMapping: {
        contentPath: 'response'
      },
      parameters: {
        maxTokens: 4000,
        temperature: 0.7
      }
    });

    // Hugging Face Inference API
    this.registerModel({
      id: 'huggingface-code-llama',
      name: 'Code Llama (Hugging Face)',
      provider: 'huggingface',
      endpoint: 'https://api-inference.huggingface.co/models/codellama/CodeLlama-7b-Instruct-hf',
      requestFormat: 'custom',
      responseMapping: {
        contentPath: '[0].generated_text'
      },
      parameters: {
        maxTokens: 2000,
        temperature: 0.1
      }
    });

    // Together AI
    this.registerModel({
      id: 'together-mixtral',
      name: 'Mixtral 8x7B (Together AI)',
      provider: 'together',
      endpoint: 'https://api.together.xyz/inference',
      requestFormat: 'openai',
      responseMapping: {
        contentPath: 'choices[0].message.content'
      },
      parameters: {
        maxTokens: 4000,
        temperature: 0.7
      }
    });

    // Replicate
    this.registerModel({
      id: 'replicate-llama2-70b',
      name: 'Llama 2 70B (Replicate)',
      provider: 'replicate',
      endpoint: 'https://api.replicate.com/v1/predictions',
      requestFormat: 'custom',
      responseMapping: {
        contentPath: 'output'
      },
      parameters: {
        maxTokens: 4000,
        temperature: 0.75
      }
    });
  }

  registerModel(config: CustomModelConfig) {
    this.models.set(config.id, config);
  }

  getModel(id: string): CustomModelConfig | undefined {
    return this.models.get(id);
  }

  getAllModels(): CustomModelConfig[] {
    return Array.from(this.models.values());
  }

  async executeModel(
    modelId: string,
    prompt: string,
    systemPrompt?: string,
    parameters?: Partial<CustomModelConfig['parameters']>
  ): Promise<string> {
    const config = this.getModel(modelId);
    if (!config) {
      throw new Error(`Model ${modelId} not found in registry`);
    }

    const mergedParams = { ...config.parameters, ...parameters };

    try {
      switch (config.requestFormat) {
        case 'openai':
          return this.executeOpenAIFormat(config, prompt, systemPrompt, mergedParams);
        case 'anthropic':
          return this.executeAnthropicFormat(config, prompt, systemPrompt, mergedParams);
        case 'custom':
          return this.executeCustomFormat(config, prompt, systemPrompt, mergedParams);
        default:
          throw new Error(`Unsupported request format: ${config.requestFormat}`);
      }
    } catch (error) {
      console.error(`Custom model execution error for ${modelId}:`, error);
      throw new Error(`Failed to execute ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeOpenAIFormat(
    config: CustomModelConfig,
    prompt: string,
    systemPrompt?: string,
    parameters?: any
  ): Promise<string> {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody = {
      model: config.id,
      messages,
      max_tokens: parameters?.maxTokens || 4000,
      temperature: parameters?.temperature || 0.7,
      top_p: parameters?.topP || 1
    };

    const response = await axios.post(config.endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...config.headers
      }
    });

    return this.extractResponse(response.data, config.responseMapping.contentPath);
  }

  private async executeAnthropicFormat(
    config: CustomModelConfig,
    prompt: string,
    systemPrompt?: string,
    parameters?: any
  ): Promise<string> {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\nHuman: ${prompt}\n\nAssistant:` : `Human: ${prompt}\n\nAssistant:`;

    const requestBody = {
      model: config.id,
      prompt: fullPrompt,
      max_tokens_to_sample: parameters?.maxTokens || 4000,
      temperature: parameters?.temperature || 0.7
    };

    const response = await axios.post(config.endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        ...config.headers
      }
    });

    return this.extractResponse(response.data, config.responseMapping.contentPath);
  }

  private async executeCustomFormat(
    config: CustomModelConfig,
    prompt: string,
    systemPrompt?: string,
    parameters?: any
  ): Promise<string> {
    let requestBody: any;

    switch (config.provider) {
      case 'ollama':
        requestBody = {
          model: config.id.replace('local-ollama-', ''),
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          stream: false,
          options: {
            temperature: parameters?.temperature || 0.7,
            num_predict: parameters?.maxTokens || 4000
          }
        };
        break;

      case 'huggingface':
        requestBody = {
          inputs: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          parameters: {
            max_new_tokens: parameters?.maxTokens || 2000,
            temperature: parameters?.temperature || 0.7,
            return_full_text: false
          }
        };
        break;

      case 'together':
        requestBody = {
          model: config.id.replace('together-', ''),
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          max_tokens: parameters?.maxTokens || 4000,
          temperature: parameters?.temperature || 0.7
        };
        break;

      case 'replicate':
        requestBody = {
          version: config.id,
          input: {
            prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
            max_length: parameters?.maxTokens || 4000,
            temperature: parameters?.temperature || 0.75
          }
        };
        break;

      default:
        throw new Error(`Unsupported custom provider: ${config.provider}`);
    }

    const response = await axios.post(config.endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined,
        ...config.headers
      }
    });

    return this.extractResponse(response.data, config.responseMapping.contentPath);
  }

  private extractResponse(data: any, path: string): string {
    const keys = path.split(/[\.\[\]]+/).filter(Boolean);
    let result = data;

    for (const key of keys) {
      if (result === null || result === undefined) {
        throw new Error(`Response path ${path} not found in response`);
      }
      
      if (Array.isArray(result) && !isNaN(Number(key))) {
        result = result[Number(key)];
      } else {
        result = result[key];
      }
    }

    if (typeof result !== 'string') {
      throw new Error(`Expected string response at path ${path}, got ${typeof result}`);
    }

    return result;
  }

  // Admin methods for managing custom models
  addCustomEndpoint(config: CustomModelConfig): void {
    this.registerModel(config);
  }

  removeModel(id: string): boolean {
    return this.models.delete(id);
  }

  updateModel(id: string, updates: Partial<CustomModelConfig>): boolean {
    const existing = this.models.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...updates };
    this.models.set(id, updated);
    return true;
  }
}

export const customModelRegistry = new CustomModelRegistry();