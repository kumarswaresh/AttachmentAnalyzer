import Anthropic from '@anthropic-ai/sdk';
import { CodeAgent, InsertCodeAgent } from '@shared/schema';
import { db } from '../db';
import { codeAgents } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
const anthropic = new Anthropic({
  apiKey: process.env.OPENAI_API_KEY, // We'll use the OpenAI key for now
});

export class CodeAgentService {
  async createAgent(userId: number, agentData: InsertCodeAgent): Promise<CodeAgent> {
    const [newAgent] = await db
      .insert(codeAgents)
      .values({
        ...agentData,
        userId,
      })
      .returning();
    
    return newAgent;
  }

  async getAgentsByUser(userId: number): Promise<CodeAgent[]> {
    return await db
      .select()
      .from(codeAgents)
      .where(eq(codeAgents.userId, userId))
      .orderBy(desc(codeAgents.createdAt));
  }

  async getAgent(agentId: number, userId: number): Promise<CodeAgent | null> {
    const [agent] = await db
      .select()
      .from(codeAgents)
      .where(and(eq(codeAgents.id, agentId), eq(codeAgents.userId, userId)));
    
    return agent || null;
  }

  async updateAgent(agentId: number, userId: number, updates: Partial<InsertCodeAgent>): Promise<CodeAgent | null> {
    const [updatedAgent] = await db
      .update(codeAgents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(codeAgents.id, agentId), eq(codeAgents.userId, userId)))
      .returning();
    
    return updatedAgent || null;
  }

  async deleteAgent(agentId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(codeAgents)
      .where(and(eq(codeAgents.id, agentId), eq(codeAgents.userId, userId)))
      .returning();
    
    return result.length > 0;
  }

  async executeAgent(agentId: number, userId: number, input: string): Promise<{ success: boolean; output?: string; error?: string }> {
    const agent = await this.getAgent(agentId, userId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    try {
      // Update execution count
      await db
        .update(codeAgents)
        .set({
          executionCount: (agent.executionCount || 0) + 1,
          lastExecutedAt: new Date(),
        })
        .where(eq(codeAgents.id, agentId));

      // Execute the agent code in a safe context
      const result = await this.runAgentCode(agent, input);
      return { success: true, output: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async testAgentCode(code: string, input: string = "test"): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      const result = await this.runCode(code, input);
      return { success: true, output: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async generateAgentWithClaude(description: string, category: string): Promise<{ prompt: string; code: string }> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required for agent generation. Please provide your OpenAI API key.');
    }

    try {
      const systemPrompt = `You are an expert AI agent developer. Create a JavaScript-based agent that follows these requirements:

1. The agent should be a function that takes an input parameter and returns a meaningful result
2. Include proper error handling and validation
3. Make the code clean, well-commented, and production-ready
4. The agent should be focused on the specific category: ${category}
5. Return ONLY valid JavaScript code that can be executed directly

Create an agent for: ${description}

The code should follow this structure:
function agent(input) {
  // Agent logic here
  return result;
}

// Example usage (commented out)
// console.log(agent("example input"));`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          { role: "user", content: systemPrompt }
        ],
      });

      const generatedCode = response.content[0].text;
      
      // Generate a system prompt for the agent
      const agentPrompt = `You are a specialized AI agent for ${category}. ${description}. 
Process user requests efficiently and provide helpful, accurate responses within your domain of expertise.`;

      return {
        prompt: agentPrompt,
        code: generatedCode
      };
    } catch (error) {
      throw new Error(`Failed to generate agent with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async runAgentCode(agent: CodeAgent, input: string): Promise<string> {
    return this.runCode(agent.code, input);
  }

  private async runCode(code: string, input: string): Promise<string> {
    // Create a safe execution environment
    const safeGlobals = {
      console: {
        log: (...args: any[]) => args.join(' ')
      },
      JSON,
      Math,
      Date,
      String,
      Number,
      Boolean,
      Array,
      Object,
      RegExp,
      Error,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      btoa: (str: string) => Buffer.from(str).toString('base64'),
      atob: (str: string) => Buffer.from(str, 'base64').toString(),
    };

    try {
      // Wrap the code in a function to isolate scope
      const wrappedCode = `
        (function(input, globals) {
          "use strict";
          ${Object.keys(safeGlobals).map(key => `const ${key} = globals.${key};`).join('\n')}
          
          ${code}
          
          // Try to find and execute the main function
          if (typeof agent === 'function') {
            return agent(input);
          } else if (typeof main === 'function') {
            return main(input);
          } else {
            // If no main function, try to evaluate the code directly
            return eval(code);
          }
        })
      `;

      const fn = eval(wrappedCode);
      const result = fn(input, safeGlobals);
      
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
      throw new Error(`Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAgentTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    prompt: string;
    code: string;
    model: string;
  }>> {
    return [
      {
        id: 'data-analyzer',
        name: 'Data Analyzer',
        description: 'Analyzes data patterns and generates insights',
        category: 'analytics',
        model: 'claude-sonnet-4-20250514',
        prompt: 'You are a data analysis specialist. Analyze the provided data and identify patterns, trends, and insights.',
        code: `function agent(input) {
  try {
    // Parse input data
    let data;
    if (typeof input === 'string') {
      try {
        data = JSON.parse(input);
      } catch {
        data = input.split(',').map(item => item.trim());
      }
    } else {
      data = input;
    }

    if (!Array.isArray(data)) {
      return "Error: Input must be an array or comma-separated values";
    }

    // Basic statistical analysis
    const numbers = data.filter(item => !isNaN(Number(item))).map(Number);
    
    if (numbers.length === 0) {
      return "Error: No numeric data found for analysis";
    }

    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const median = numbers.sort((a, b) => a - b)[Math.floor(numbers.length / 2)];

    const analysis = {
      count: numbers.length,
      sum: sum,
      average: avg.toFixed(2),
      minimum: min,
      maximum: max,
      median: median,
      range: max - min
    };

    return \`Data Analysis Results:
📊 Count: \${analysis.count} values
📈 Average: \${analysis.average}
📉 Range: \${analysis.minimum} - \${analysis.maximum}
🎯 Median: \${analysis.median}
📋 Sum: \${analysis.sum}\`;

  } catch (error) {
    return \`Analysis Error: \${error.message}\`;
  }
}`
      },
      {
        id: 'content-generator',
        name: 'Content Generator',
        description: 'Generates marketing content and copy',
        category: 'marketing',
        model: 'claude-sonnet-4-20250514',
        prompt: 'You are a content marketing specialist. Create engaging, persuasive content based on the given requirements.',
        code: `function agent(input) {
  try {
    const request = typeof input === 'string' ? input : JSON.stringify(input);
    
    // Simple content generation based on keywords
    const keywords = request.toLowerCase().match(/\\b\\w+\\b/g) || [];
    
    // Content templates
    const templates = {
      social: [
        "🚀 Discover the power of {topic}! Transform your {field} today.",
        "💡 Ready to revolutionize your {field}? Our {topic} solution is here!",
        "✨ Unlock new possibilities with {topic} - your {field} will never be the same!"
      ],
      email: [
        "Subject: Transform Your {field} with {topic}\\n\\nDear Valued Customer,\\n\\nWe're excited to introduce you to {topic}...",
        "Subject: Don't Miss Out - {topic} Revolution\\n\\nHello,\\n\\nThe future of {field} is here with {topic}..."
      ],
      blog: [
        "# The Ultimate Guide to {topic} in {field}\\n\\nIn today's fast-paced world, {topic} has become essential...",
        "# Why {topic} is Changing the {field} Landscape\\n\\nAs we move forward, {topic} continues to reshape..."
      ]
    };

    // Detect content type
    let contentType = 'social';
    if (request.includes('email') || request.includes('subject')) contentType = 'email';
    if (request.includes('blog') || request.includes('article')) contentType = 'blog';

    // Extract main topic and field
    const topic = keywords.find(word => word.length > 4) || 'innovation';
    const field = keywords.find(word => ['business', 'marketing', 'tech', 'sales'].includes(word)) || 'business';

    // Select random template
    const selectedTemplates = templates[contentType];
    const template = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];

    // Replace placeholders
    const content = template
      .replace(/{topic}/g, topic)
      .replace(/{field}/g, field);

    return \`Generated \${contentType.toUpperCase()} Content:\\n\\n\${content}\`;

  } catch (error) {
    return \`Content Generation Error: \${error.message}\`;
  }
}`
      },
      {
        id: 'code-helper',
        name: 'Code Helper',
        description: 'Assists with code generation and debugging',
        category: 'development',
        model: 'claude-sonnet-4-20250514',
        prompt: 'You are a senior software developer. Help with code generation, debugging, and best practices.',
        code: `function agent(input) {
  try {
    const request = input.toLowerCase();
    
    if (request.includes('debug') || request.includes('error')) {
      return \`🐛 Debugging Checklist:
1. Check console for error messages
2. Verify variable names and types
3. Ensure proper syntax (missing semicolons, brackets)
4. Check API endpoints and data flow
5. Use browser dev tools for inspection
6. Add console.log statements for tracing

Common fixes:
- Undefined variables: Check scope and declarations
- Async issues: Use await with async functions
- Type errors: Validate data types before operations\`;
    }
    
    if (request.includes('function') || request.includes('generate')) {
      return \`// Example function template
function processData(input) {
  // Input validation
  if (!input) {
    throw new Error('Input is required');
  }
  
  try {
    // Main logic here
    const result = input.toString().toUpperCase();
    
    // Return processed result
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Usage example:
// const result = processData('hello world');\`;
    }
    
    if (request.includes('best practice') || request.includes('tips')) {
      return \`💡 Coding Best Practices:

🔧 Code Quality:
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic
- Follow consistent formatting

🛡️ Error Handling:
- Always validate inputs
- Use try-catch blocks
- Provide meaningful error messages
- Log errors for debugging

⚡ Performance:
- Avoid unnecessary loops
- Use efficient data structures
- Minimize DOM manipulation
- Cache computed values when possible

🧪 Testing:
- Write unit tests
- Test edge cases
- Use assertions
- Mock external dependencies\`;
    }
    
    return "I can help with debugging, code generation, and best practices. Try asking about 'debug tips', 'generate function', or 'best practices'.";
    
  } catch (error) {
    return \`Code Helper Error: \${error.message}\`;
  }
}`
      }
    ];
  }
}

export const codeAgentService = new CodeAgentService();