import { storage } from "../storage";
import { hotelRecommendationService } from "./HotelRecommendationService";

interface DefaultPrompt {
  agentType: string;
  prompt: string;
  expectedBehavior: string;
  description: string;
}

interface TestResult {
  agentId: string;
  promptType: 'default' | 'custom';
  prompt: string;
  expectedOutput?: string;
  actualOutput: string;
  success: boolean;
  executionTime: number;
  timestamp: Date;
  metadata?: any;
}

class AgentTestingService {
  private defaultPrompts: Record<string, DefaultPrompt[]> = {
    marketing: [
      {
        agentType: "marketing",
        prompt: "I need luxury hotel recommendations in Paris for a business trip next month.",
        expectedBehavior: "Should provide luxury hotel recommendations in Paris with business amenities",
        description: "Luxury Hotels - Business Travel"
      },
      {
        agentType: "marketing",
        prompt: "What are the trending destinations for honeymoon travel this year?",
        expectedBehavior: "Should provide trending romantic destinations with current popularity data",
        description: "Trending Destinations - Romantic Travel"
      },
      {
        agentType: "marketing",
        prompt: "Recommend budget-friendly hotels in Tokyo for a family vacation.",
        expectedBehavior: "Should suggest budget hotels in Tokyo suitable for families",
        description: "Cheapest Options - Family Travel"
      },
      {
        agentType: "marketing",
        prompt: "Find the best hotels for attending music festivals in Barcelona.",
        expectedBehavior: "Should recommend hotels near festival venues with good transport links",
        description: "Best for Events/Festivals - Entertainment"
      },
      {
        agentType: "marketing",
        prompt: "What are the most popular hotel bookings in London right now?",
        expectedBehavior: "Should provide trending hotel bookings and popular choices in London",
        description: "Trending Bookings - Popular Destinations"
      }
    ],
    general: [
      {
        agentType: "general",
        prompt: "Hello, can you help me with my request?",
        expectedBehavior: "Should provide a helpful greeting and ask for more details",
        description: "Test basic greeting and helpfulness"
      },
      {
        agentType: "general",
        prompt: "What can you do for me?",
        expectedBehavior: "Should explain capabilities and available services",
        description: "Test capability explanation"
      }
    ],
    assistant: [
      {
        agentType: "assistant",
        prompt: "I need help organizing my schedule for next week.",
        expectedBehavior: "Should offer assistance with schedule organization",
        description: "Test schedule management assistance"
      },
      {
        agentType: "assistant",
        prompt: "Can you summarize the key points from this document?",
        expectedBehavior: "Should request the document and offer summarization help",
        description: "Test document summarization capability"
      }
    ]
  };

  async getDefaultPrompts(agentType?: string): Promise<DefaultPrompt[]> {
    if (agentType) {
      return this.defaultPrompts[agentType] || this.defaultPrompts.general;
    }
    
    // Return all default prompts
    return Object.values(this.defaultPrompts).flat();
  }

  async testAgentWithDefaultPrompt(agentId: string, promptIndex: number = 0): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Determine agent type based on role or name
      const agentType = this.getAgentType(agent);
      const defaultPrompts = await this.getDefaultPrompts(agentType);
      
      if (promptIndex >= defaultPrompts.length) {
        throw new Error(`Prompt index ${promptIndex} out of range for agent type ${agentType}`);
      }

      const defaultPrompt = defaultPrompts[promptIndex];
      const actualOutput = await this.executeAgentPrompt(agent, defaultPrompt.prompt);
      
      const executionTime = Date.now() - startTime;
      
      return {
        agentId,
        promptType: 'default',
        prompt: defaultPrompt.prompt,
        expectedOutput: defaultPrompt.expectedBehavior,
        actualOutput,
        success: this.evaluateResponse(actualOutput, defaultPrompt.expectedBehavior),
        executionTime,
        timestamp: new Date(),
        metadata: {
          agentType,
          description: defaultPrompt.description
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        agentId,
        promptType: 'default',
        prompt: 'Failed to execute',
        actualOutput: `Error: ${error.message}`,
        success: false,
        executionTime,
        timestamp: new Date()
      };
    }
  }

  async testAgentWithCustomPrompt(agentId: string, prompt: string, expectedOutput?: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Apply content guardrails
      const guardrailsCheck = this.checkContentGuardrails(prompt);
      if (!guardrailsCheck.allowed) {
        const executionTime = Date.now() - startTime;
        return {
          agentId,
          promptType: 'custom',
          prompt,
          expectedOutput,
          actualOutput: `Content policy violation: ${guardrailsCheck.reason}. Please ensure your request is appropriate and relates to hotel recommendations or travel assistance.`,
          success: false,
          executionTime,
          timestamp: new Date(),
          metadata: { contentFiltered: true, reason: guardrailsCheck.reason }
        };
      }

      const actualOutput = await this.executeAgentPrompt(agent, prompt);
      const executionTime = Date.now() - startTime;
      
      return {
        agentId,
        promptType: 'custom',
        prompt,
        expectedOutput,
        actualOutput,
        success: expectedOutput ? this.evaluateResponse(actualOutput, expectedOutput) : true,
        executionTime,
        timestamp: new Date(),
        metadata: {
          agentType: this.getAgentType(agent)
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        agentId,
        promptType: 'custom',
        prompt,
        actualOutput: `Error: ${error.message}`,
        success: false,
        executionTime,
        timestamp: new Date()
      };
    }
  }

  private checkContentGuardrails(prompt: string): { allowed: boolean; reason?: string } {
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for explicit content
    const explicitTerms = ['explicit', 'sexual', 'adult', 'pornographic', 'nsfw', 'erotic'];
    if (explicitTerms.some(term => lowerPrompt.includes(term))) {
      return { allowed: false, reason: 'Explicit content not allowed' };
    }

    // Check for abusive content
    const abusiveTerms = ['abuse', 'violence', 'harm', 'kill', 'murder', 'assault', 'attack'];
    if (abusiveTerms.some(term => lowerPrompt.includes(term))) {
      return { allowed: false, reason: 'Abusive or violent content not allowed' };
    }

    // Check for illegal content
    const illegalTerms = ['illegal', 'drugs', 'weapon', 'bomb', 'terrorist', 'fraud', 'scam'];
    if (illegalTerms.some(term => lowerPrompt.includes(term))) {
      return { allowed: false, reason: 'Illegal activities not supported' };
    }

    return { allowed: true };
  }

  private getAgentType(agent: any): string {
    // Determine agent type based on role, name, or modules
    if (agent.role?.includes('marketing') || agent.name?.toLowerCase().includes('marketing')) {
      return 'marketing';
    }
    if (agent.role?.includes('assistant') || agent.name?.toLowerCase().includes('assistant')) {
      return 'assistant';
    }
    return 'general';
  }

  private async executeAgentPrompt(agent: any, prompt: string): Promise<string> {
    try {
      // For marketing agents, use the real hotel recommendation service
      if (this.getAgentType(agent) === 'marketing') {
        const hotelRequest = this.extractHotelRequest(prompt);
        const recommendations = await hotelRecommendationService.generateRecommendations(hotelRequest);
        
        return this.formatHotelResponse(recommendations);
      }

      // For other agents, generate a contextual response based on their configuration
      return this.generateContextualResponse(agent, prompt);
    } catch (error) {
      throw new Error(`Failed to execute prompt: ${error.message}`);
    }
  }

  private extractPreferences(prompt: string): any {
    const preferences: any = {};
    
    // Extract budget category
    if (prompt.toLowerCase().includes('luxury')) {
      preferences.budget = 'luxury';
    } else if (prompt.toLowerCase().includes('budget')) {
      preferences.budget = 'budget';
    } else if (prompt.toLowerCase().includes('business')) {
      preferences.budget = 'business';
    }
    
    // Extract destination
    const destinations = ['paris', 'tokyo', 'london', 'new york', 'rome', 'dubai', 'singapore', 'amsterdam', 'barcelona', 'sydney'];
    for (const dest of destinations) {
      if (prompt.toLowerCase().includes(dest)) {
        preferences.destination = dest;
        break;
      }
    }
    
    // Extract traveler count
    if (prompt.toLowerCase().includes('family')) {
      preferences.travelers = 4;
    } else if (prompt.toLowerCase().includes('couple') || prompt.toLowerCase().includes('honeymoon')) {
      preferences.travelers = 2;
    } else {
      preferences.travelers = 1;
    }
    
    return preferences;
  }

  private formatMarketingResponse(recommendations: any): string {
    let response = `Based on your request, here are my recommendations:\n\n`;
    
    // Add hotel recommendations
    if (recommendations.recommendations?.length > 0) {
      response += `🏨 Recommended Hotels:\n`;
      recommendations.recommendations.slice(0, 3).forEach((hotel: any, index: number) => {
        response += `${index + 1}. ${hotel.name} (${hotel.category}) - ${hotel.reason}\n`;
      });
    }
    
    // Add trending insights
    if (recommendations.trends?.length > 0) {
      response += `\n📈 Current Trends:\n`;
      recommendations.trends.slice(0, 2).forEach((trend: any) => {
        response += `• ${trend.destination}: ${trend.popularity}% popularity (${trend.trend} trend)\n`;
      });
    }
    
    // Add AI insights
    if (recommendations.insights) {
      response += `\n💡 Insights: ${recommendations.insights}`;
    }
    
    return response;
  }

  private generateContextualResponse(agent: any, prompt: string): string {
    const responses = {
      greeting: [
        `Hello! I'm ${agent.name}, and I'm here to help you. How can I assist you today?`,
        `Hi there! I'm ${agent.name}, your AI assistant. What can I do for you?`,
        `Welcome! I'm ${agent.name}. I'm ready to help with your request.`
      ],
      capability: [
        `I'm ${agent.name}, designed to ${agent.goal}. I can help you with various tasks related to my specialization.`,
        `As ${agent.name}, my main focus is: ${agent.goal}. I'm equipped with several modules to assist you effectively.`,
        `I'm an AI agent called ${agent.name}. My purpose is to ${agent.goal}. How can I put my capabilities to work for you?`
      ],
      schedule: [
        `I'd be happy to help you organize your schedule! While I don't have access to your calendar directly, I can provide guidance on schedule management best practices.`,
        `Schedule organization is something I can definitely assist with. What specific aspects of your schedule would you like help with?`
      ],
      document: [
        `I can help with document summarization! Please share the document or key content you'd like me to summarize.`,
        `Document analysis is one of my capabilities. If you provide the document, I can create a comprehensive summary for you.`
      ],
      default: [
        `Thank you for your question. As ${agent.name}, I'm designed to ${agent.goal}. Could you provide more specific details so I can assist you better?`,
        `I understand you need assistance. Based on my role as ${agent.name}, I'll do my best to help. Can you elaborate on what you're looking for?`
      ]
    };

    // Determine response type based on prompt content
    let responseType = 'default';
    if (prompt.toLowerCase().includes('hello') || prompt.toLowerCase().includes('help me')) {
      responseType = 'greeting';
    } else if (prompt.toLowerCase().includes('what can you do') || prompt.toLowerCase().includes('capabilities')) {
      responseType = 'capability';
    } else if (prompt.toLowerCase().includes('schedule') || prompt.toLowerCase().includes('organize')) {
      responseType = 'schedule';
    } else if (prompt.toLowerCase().includes('document') || prompt.toLowerCase().includes('summarize')) {
      responseType = 'document';
    }

    const options = responses[responseType] || responses.default;
    return options[Math.floor(Math.random() * options.length)];
  }

  private evaluateResponse(actualOutput: string, expectedBehavior: string): boolean {
    // Simple evaluation based on key terms and response quality
    const actualLower = actualOutput.toLowerCase();
    const expectedLower = expectedBehavior.toLowerCase();
    
    // Check if response contains expected key terms
    const keyTerms = expectedLower.split(' ').filter(term => 
      term.length > 3 && !['should', 'provide', 'with', 'and', 'the', 'for'].includes(term)
    );
    
    const foundTerms = keyTerms.filter(term => actualLower.includes(term));
    const matchRatio = foundTerms.length / keyTerms.length;
    
    // Consider successful if at least 30% of key terms are found and response is substantial
    return matchRatio >= 0.3 && actualOutput.length > 50;
  }

  async getAllAgentTestResults(agentId: string): Promise<TestResult[]> {
    // In a real implementation, this would fetch from database
    // For now, return sample test history
    return [
      {
        agentId,
        promptType: 'default',
        prompt: 'Sample default prompt test',
        actualOutput: 'Sample response from previous test',
        success: true,
        executionTime: 1250,
        timestamp: new Date(Date.now() - 86400000) // Yesterday
      }
    ];
  }
}

export const agentTestingService = new AgentTestingService();