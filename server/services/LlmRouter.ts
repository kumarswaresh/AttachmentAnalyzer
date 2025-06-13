import { Agent } from "@shared/schema";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import OpenAI from "openai";
import { customModelRegistry } from "./CustomModelRegistry";

export class LlmRouter {
  private bedrockClient: BedrockRuntimeClient;
  private openaiClient: OpenAI;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not found in environment variables');
    }
    
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async executeAgent(agent: Agent, input: string): Promise<string> {
    console.log('Raw agent model:', agent.model);
    const model = this.parseModel(agent.model);
    console.log('Parsed model:', model);
    
    switch (model.provider) {
      case "bedrock":
        return this.executeBedrock(agent, input, model.modelId);
      case "custom":
        return this.executeCustomModel(agent, input, model.modelId);
      case "openai":
        return this.executeOpenAI(agent, input, model.modelId);
      default:
        throw new Error(`Unsupported model provider: ${model.provider}`);
    }
  }

  private parseModel(modelString: string): { provider: string; modelId: string } {
    // Check if it's a JSON string (new format)
    if (modelString.startsWith("{")) {
      try {
        const modelConfig = JSON.parse(modelString);
        return {
          provider: modelConfig.provider || "openai",
          modelId: modelConfig.model || "gpt-4-turbo"
        };
      } catch (error) {
        console.error("Failed to parse model JSON:", error);
      }
    }
    
    // Legacy string formats
    if (modelString.startsWith("bedrock:")) {
      return {
        provider: "bedrock",
        modelId: modelString.replace("bedrock:", "")
      };
    } else if (modelString.startsWith("openai:") || modelString.startsWith("custom:openai-")) {
      return {
        provider: "openai",
        modelId: modelString.replace("openai:", "").replace("custom:openai-", "")
      };
    } else if (modelString.startsWith("custom:")) {
      return {
        provider: "custom",
        modelId: modelString.replace("custom:", "")
      };
    } else {
      // Default to bedrock if no prefix
      return {
        provider: "bedrock",
        modelId: modelString
      };
    }
  }

  private async executeBedrock(agent: Agent, input: string, modelId: string): Promise<string> {
    try {
      // Build context-aware prompt
      const systemPrompt = this.buildSystemPrompt(agent);
      const userPrompt = input;

      let payload: any;
      let outputKey: string;

      // Handle different Bedrock model formats
      if (modelId.includes("anthropic.claude")) {
        payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4000,
          temperature: 0.7,
          messages: [
            {
              role: "user",
              content: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`
            }
          ]
        };
        outputKey = "content";
      } else if (modelId.includes("amazon.titan")) {
        payload = {
          inputText: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
          textGenerationConfig: {
            maxTokenCount: 4000,
            temperature: 0.7,
            topP: 0.9
          }
        };
        outputKey = "results";
      } else {
        throw new Error(`Unsupported Bedrock model: ${modelId}`);
      }

      const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload)
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract response based on model type
      if (modelId.includes("anthropic.claude")) {
        return responseBody.content[0].text;
      } else if (modelId.includes("amazon.titan")) {
        return responseBody.results[0].outputText;
      }

      throw new Error("Unexpected response format from Bedrock");

    } catch (error) {
      console.error("Bedrock execution error:", error);
      throw new Error(`Bedrock execution failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async executeOpenAI(agent: Agent, input: string, modelId: string): Promise<string> {
    try {
      // For hotel recommendations, use specialized prompt
      const isHotelRequest = input.toLowerCase().includes('hotel') || 
                           input.toLowerCase().includes('accommodation') ||
                           input.toLowerCase().includes('luxury') ||
                           input.toLowerCase().includes('business travel') ||
                           input.toLowerCase().includes('properties in');
      
      let systemPrompt;
      if (isHotelRequest) {
        // Simple location extraction - look for city names directly in the input
        let extractedLocation = 'unknown location';
        const inputLower = input.toLowerCase();
        
        if (inputLower.includes('paris')) {
          extractedLocation = 'Paris';
        } else if (inputLower.includes('tokyo')) {
          extractedLocation = 'Tokyo';
        } else if (inputLower.includes('london')) {
          extractedLocation = 'London';
        } else if (inputLower.includes('new york')) {
          extractedLocation = 'New York';
        } else if (inputLower.includes('cancun')) {
          extractedLocation = 'Cancun';
        } else {
          // Fallback regex for other locations
          const locationMatch = input.match(/in\s+([A-Za-z\s]+)/i);
          if (locationMatch) {
            extractedLocation = locationMatch[1].trim().split(',')[0].split(' ')[0];
          }
        }
        
        console.log(`LOCATION EXTRACTION DEBUG: Input="${input}", Extracted="${extractedLocation}"`);
        
        // Force unique timestamp-based response to prevent cached results
        const uniqueId = Date.now() + Math.random();
        
        // Extract the requested number of hotels from the input
        const countMatch = input.match(/(\d+)/);
        const requestedCount = countMatch ? Math.min(parseInt(countMatch[0]), 12) : 5; // Cap at 12 for performance
        
        systemPrompt = `Generate a JSON array of ${requestedCount} luxury hotels in ${extractedLocation}. Return ONLY the JSON array.

Format: [{"countryCode":"FR","countryName":"France","stateCode":"IDF","state":"Île-de-France","cityCode":1,"cityName":"${extractedLocation}","code":101,"name":"Hotel Name","rating":4.5,"description":"Brief description","imageUrl":"https://example.com/images/hotel-slug.jpg"}]

Requirements:
- All hotels in ${extractedLocation} only
- Real hotel names
- 4+ star rating
- Proper country codes`;
      } else {
        systemPrompt = this.buildSystemPrompt(agent);
      }
      
      // Map model IDs to OpenAI model names
      let openaiModel: string;
      switch (modelId) {
        case "gpt-4-turbo":
        case "gpt-4o":
          openaiModel = "gpt-4o";
          break;
        case "gpt-4o-mini":
          openaiModel = "gpt-4o-mini";
          break;
        case "gpt-4.1-nano":
        case "gpt-4.1-nano-2025-04-14":
          openaiModel = "gpt-4o-mini"; // Use reliable model instead
          break;
        case "gpt-3.5-turbo":
          openaiModel = "gpt-3.5-turbo";
          break;
        default:
          openaiModel = "gpt-4o-mini"; // Use reliable model as default
      }

      console.log(`Making OpenAI request with model: ${openaiModel}`);
      console.log(`Location extracted: ${isHotelRequest ? (input.match(/in\s+([^,]+(?:,\s*[^,]+)*)/i)?.[1]?.trim() || 'none') : 'not hotel request'}`);
      
      let completion;
      try {
        completion = await Promise.race([
          this.openaiClient.chat.completions.create({
            model: openaiModel,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: input + (isHotelRequest ? ` [TIMESTAMP: ${Date.now()}]` : '')
              }
            ],
            max_tokens: isHotelRequest ? 6000 : (agent.guardrails.maxTokens || 4000),
            temperature: isHotelRequest ? 0.8 : 0.7,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OpenAI request timeout after 20 seconds')), 20000)
          )
        ]) as any;
      } catch (error: any) {
        if (isHotelRequest && error.message.includes('timeout')) {
          // Fallback: generate smaller batch for hotel requests
          console.log('Hotel request timed out, trying smaller batch...');
          const smallerCount = Math.min(requestedCount, 6);
          const fallbackPrompt = `Generate ${smallerCount} luxury hotels in ${extractedLocation}. JSON only: [{"countryCode":"","countryName":"","stateCode":"","state":"","cityCode":1,"cityName":"${extractedLocation}","code":101,"name":"","rating":4.5,"description":"","imageUrl":""}]`;
          
          completion = await this.openaiClient.chat.completions.create({
            model: "gpt-4o-mini", // Force reliable model
            messages: [
              { role: "system", content: fallbackPrompt },
              { role: "user", content: `Hotels in ${extractedLocation}` }
            ],
            max_tokens: 3000,
            temperature: 0.7,
          });
        } else {
          throw error;
        }
      }

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response content from OpenAI");
      }

      return response;
    } catch (error) {
      console.error("OpenAI execution error:", error);
      throw new Error(`OpenAI execution failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async executeCustomModel(agent: Agent, input: string, modelId: string): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(agent);
      
      // Try to find model in custom registry first
      const customModel = customModelRegistry.getModel(modelId);
      if (customModel) {
        return await customModelRegistry.executeModel(
          modelId,
          input,
          systemPrompt,
          {
            maxTokens: agent.guardrails.maxTokens,
            temperature: 0.7
          }
        );
      }
      
      // Fallback to built-in custom model handlers
      switch (modelId) {
        case "google-gemini-pro":
          return this.executeGeminiPro(agent, input, systemPrompt);
        case "anthropic-claude-direct":
          return this.executeClaudeDirect(agent, input, systemPrompt);
        case "company-llm-v1":
        case "company-fine-tuned-model":
          return this.executeCompanyModel(agent, input, systemPrompt);
        case "local-llm":
        case "local-deployment-model":
          return this.executeLocalModel(agent, input, systemPrompt);
        default:
          throw new Error(`Unsupported custom model: ${modelId}`);
      }
    } catch (error) {
      console.error("Custom model execution error:", error);
      throw new Error(`Custom model execution failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async executeGeminiPro(agent: Agent, input: string, systemPrompt: string): Promise<string> {
    // Google Gemini Pro integration would go here
    // This would require Google AI Studio API key and client
    throw new Error("Gemini Pro integration requires Google AI Studio API credentials");
  }

  private async executeClaudeDirect(agent: Agent, input: string, systemPrompt: string): Promise<string> {
    // Direct Anthropic Claude API integration would go here
    // This would require Anthropic API key and client
    throw new Error("Direct Claude integration requires Anthropic API credentials");
  }

  private async executeCompanyModel(agent: Agent, input: string, systemPrompt: string): Promise<string> {
    // Company-specific model integration
    // This would typically involve calling your organization's custom LLM API
    throw new Error("Company model integration requires custom API endpoint configuration");
  }

  private async executeLocalModel(agent: Agent, input: string, systemPrompt: string): Promise<string> {
    // Local model integration (e.g., Ollama, local inference server)
    // This would involve calling a local inference server
    throw new Error("Local model integration requires local inference server configuration");
  }

  private buildSystemPrompt(agent: Agent): string {
    let prompt = `You are ${agent.name}, an AI agent with the following characteristics:

GOAL: ${agent.goal}

ROLE: ${agent.role}

CAPABILITIES: You have access to the following modules:
${agent.modules.map(m => `- ${m.moduleId} (${m.enabled ? 'enabled' : 'disabled'})`).join('\n')}

GUARDRAILS:`;

    if (agent.guardrails.contentFiltering) {
      prompt += "\n- Apply content filtering to all responses";
    }
    if (agent.guardrails.requireHumanApproval) {
      prompt += "\n- Indicate when human approval is recommended";
    }
    if (agent.guardrails.readOnlyMode) {
      prompt += "\n- You are in read-only mode and cannot perform write operations";
    }
    if (agent.guardrails.maxTokens) {
      prompt += `\n- Keep responses under ${agent.guardrails.maxTokens} tokens`;
    }

    prompt += `\n\nAlways respond in character as ${agent.name} and focus on achieving your goal while adhering to your guardrails.`;

    return prompt;
  }
}
