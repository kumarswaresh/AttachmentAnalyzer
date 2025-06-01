import { Agent } from "@shared/schema";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export class LlmRouter {
  private bedrockClient: BedrockRuntimeClient;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async executeAgent(agent: Agent, input: string): Promise<string> {
    const model = this.parseModel(agent.model);
    
    switch (model.provider) {
      case "bedrock":
        return this.executeBedrock(agent, input, model.modelId);
      case "custom":
        return this.executeCustomModel(agent, input, model.modelId);
      default:
        throw new Error(`Unsupported model provider: ${model.provider}`);
    }
  }

  private parseModel(modelString: string): { provider: string; modelId: string } {
    if (modelString.startsWith("bedrock:")) {
      return {
        provider: "bedrock",
        modelId: modelString.replace("bedrock:", "")
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

  private async executeCustomModel(agent: Agent, input: string, modelId: string): Promise<string> {
    // Implementation for custom company models
    // This would typically involve calling your organization's custom LLM API
    throw new Error("Custom model execution not yet implemented");
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
