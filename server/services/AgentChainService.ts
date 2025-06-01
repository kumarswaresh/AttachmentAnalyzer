import { nanoid } from 'nanoid';
import { randomUUID } from 'crypto';
import { 
  AgentChain, 
  AgentMessage, 
  ChainExecution, 
  ChainStep,
  InsertAgentChain,
  InsertAgentMessage,
  InsertChainExecution
} from '@shared/schema';

interface ChainExecutionContext {
  variables: Record<string, any>;
  stepResults: Array<{
    stepId: string;
    output: any;
    status: 'success' | 'error';
    error?: string;
  }>;
}

interface AgentExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  duration: number;
  tokenCount?: number;
}

export class AgentChainService {
  private storage: any;
  private runningExecutions = new Map<string, AbortController>();

  constructor(storage: any) {
    this.storage = storage;
  }

  // Chain Management
  async createChain(chainData: InsertAgentChain): Promise<AgentChain> {
    const chain = await this.storage.createAgentChain({
      ...chainData,
      id: chainData.id || randomUUID()
    });
    return chain;
  }

  async getChains(): Promise<AgentChain[]> {
    return await this.storage.getAgentChains();
  }

  async getChain(id: string): Promise<AgentChain | null> {
    return await this.storage.getAgentChain(id);
  }

  async updateChain(id: string, updates: Partial<AgentChain>): Promise<AgentChain> {
    return await this.storage.updateAgentChain(id, updates);
  }

  async deleteChain(id: string): Promise<void> {
    // Cancel any running executions
    const executions = await this.storage.getChainExecutions(id);
    for (const execution of executions) {
      if (execution.status === 'running') {
        await this.cancelExecution(execution.id);
      }
    }
    await this.storage.deleteAgentChain(id);
  }

  // Chain Execution
  async executeChain(
    chainId: string, 
    input: any, 
    executedBy: number,
    context: Record<string, any> = {}
  ): Promise<ChainExecution> {
    const chain = await this.getChain(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }

    if (!chain.isActive) {
      throw new Error(`Chain ${chainId} is not active`);
    }

    const executionId = randomUUID();
    const execution = await this.storage.createChainExecution({
      id: executionId,
      chainId,
      input,
      executedBy,
      context,
      status: 'running'
    });

    // Start execution in background
    this.processChainExecution(execution, chain).catch(async (error) => {
      await this.storage.updateChainExecution(executionId, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
    });

    return execution;
  }

  private async processChainExecution(execution: ChainExecution, chain: AgentChain): Promise<void> {
    const abortController = new AbortController();
    this.runningExecutions.set(execution.id, abortController);

    try {
      const context: ChainExecutionContext = {
        variables: { ...execution.context, input: execution.input },
        stepResults: []
      };

      for (let i = 0; i < chain.steps.length; i++) {
        if (abortController.signal.aborted) {
          throw new Error('Execution cancelled');
        }

        const step = chain.steps[i];
        
        // Update current step
        await this.storage.updateChainExecution(execution.id, {
          currentStep: i
        });

        // Check step condition
        if (!this.shouldExecuteStep(step, context)) {
          context.stepResults.push({
            stepId: step.id,
            output: null,
            status: 'success'
          });
          continue;
        }

        // Prepare step input
        const stepInput = this.mapStepInput(step, context);

        try {
          // Execute step with timeout
          const result = await this.executeStepWithTimeout(step, stepInput);
          
          context.stepResults.push({
            stepId: step.id,
            output: result.output,
            status: result.success ? 'success' : 'error',
            error: result.error
          });

          // Map step output to context
          this.mapStepOutput(step, result.output, context);

          if (!result.success && step.retryCount) {
            // Implement retry logic here if needed
          }

        } catch (error) {
          context.stepResults.push({
            stepId: step.id,
            output: null,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          // Stop execution on error unless configured otherwise
          if (step.condition?.type !== 'if_error') {
            throw error;
          }
        }
      }

      // Mark execution as completed
      await this.storage.updateChainExecution(execution.id, {
        status: 'completed',
        output: context.stepResults[context.stepResults.length - 1]?.output,
        context: context.variables,
        completedAt: new Date()
      });

    } catch (error) {
      await this.storage.updateChainExecution(execution.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      });
    } finally {
      this.runningExecutions.delete(execution.id);
    }
  }

  private shouldExecuteStep(step: ChainStep, context: ChainExecutionContext): boolean {
    if (!step.condition || step.condition.type === 'always') {
      return true;
    }

    const lastResult = context.stepResults[context.stepResults.length - 1];
    
    switch (step.condition.type) {
      case 'if_success':
        return lastResult?.status === 'success';
      case 'if_error':
        return lastResult?.status === 'error';
      case 'custom':
        // Implement custom condition evaluation
        return this.evaluateCustomCondition(step.condition.expression, context);
      default:
        return true;
    }
  }

  private evaluateCustomCondition(expression: string = '', context: ChainExecutionContext): boolean {
    // Basic expression evaluation - could be enhanced with a proper expression parser
    try {
      // Create a safe evaluation context
      const evalContext = {
        variables: context.variables,
        stepResults: context.stepResults,
        lastResult: context.stepResults[context.stepResults.length - 1]
      };
      
      // Simple variable substitution
      let evaluatedExpression = expression;
      for (const [key, value] of Object.entries(evalContext.variables)) {
        evaluatedExpression = evaluatedExpression.replace(
          new RegExp(`\\$${key}\\b`, 'g'), 
          JSON.stringify(value)
        );
      }
      
      // Basic safety check
      if (evaluatedExpression.includes('eval') || evaluatedExpression.includes('function')) {
        return false;
      }
      
      return Boolean(eval(evaluatedExpression));
    } catch {
      return false;
    }
  }

  private mapStepInput(step: ChainStep, context: ChainExecutionContext): any {
    if (!step.inputMapping) {
      return context.variables;
    }

    const mappedInput: any = {};
    for (const [targetKey, sourceKey] of Object.entries(step.inputMapping)) {
      const value = this.getValueFromContext(sourceKey, context);
      mappedInput[targetKey] = value;
    }
    return mappedInput;
  }

  private mapStepOutput(step: ChainStep, output: any, context: ChainExecutionContext): void {
    if (!step.outputMapping || !output) {
      return;
    }

    for (const [sourceKey, targetKey] of Object.entries(step.outputMapping)) {
      const value = this.getValueFromObject(sourceKey, output);
      context.variables[targetKey] = value;
    }
  }

  private getValueFromContext(path: string, context: ChainExecutionContext): any {
    if (path.startsWith('variables.')) {
      return this.getValueFromObject(path.substring(10), context.variables);
    }
    if (path.startsWith('stepResults[')) {
      // Handle stepResults[0].output pattern
      const match = path.match(/stepResults\[(\d+)\]\.(.+)/);
      if (match) {
        const stepIndex = parseInt(match[1]);
        const property = match[2];
        return this.getValueFromObject(property, context.stepResults[stepIndex]);
      }
    }
    return context.variables[path];
  }

  private getValueFromObject(path: string, obj: any): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeStepWithTimeout(step: ChainStep, input: any): Promise<AgentExecutionResult> {
    const timeout = step.timeout || 300; // Default 5 minutes
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step ${step.name} timed out after ${timeout} seconds`));
      }, timeout * 1000);

      try {
        const result = await this.executeAgentStep(step.agentId, input);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private async executeAgentStep(agentId: string, input: any): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get agent
      const agent = await this.storage.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Execute agent with input
      const result = await this.storage.executeAgent(agentId, input);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        output: result.output,
        duration,
        tokenCount: result.tokenCount
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  // Message Management
  async sendMessage(messageData: InsertAgentMessage): Promise<AgentMessage> {
    const message = await this.storage.createAgentMessage({
      ...messageData,
      id: randomUUID(),
      status: 'pending'
    });

    // Process message delivery in background
    this.processMessage(message);

    return message;
  }

  private async processMessage(message: AgentMessage): Promise<void> {
    try {
      // Mark as delivered
      await this.storage.updateAgentMessage(message.id, {
        status: 'delivered',
        processedAt: new Date()
      });

      // Notify target agent (implement notification mechanism)
      await this.notifyAgent(message.toAgentId, message);

      // Mark as processed
      await this.storage.updateAgentMessage(message.id, {
        status: 'processed'
      });

    } catch (error) {
      await this.storage.updateAgentMessage(message.id, {
        status: 'failed'
      });
    }
  }

  private async notifyAgent(agentId: string, message: AgentMessage): Promise<void> {
    // Implement agent notification mechanism
    // This could trigger agent execution, webhook, or queue system
    console.log(`Notifying agent ${agentId} of new message:`, message.messageType);
  }

  async getAgentMessages(agentId: string, options: {
    messageType?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<AgentMessage[]> {
    return await this.storage.getAgentMessages(agentId, options);
  }

  // Execution Management
  async getChainExecutions(chainId: string): Promise<ChainExecution[]> {
    return await this.storage.getChainExecutions(chainId);
  }

  async getExecution(executionId: string): Promise<ChainExecution | null> {
    return await this.storage.getChainExecution(executionId);
  }

  async cancelExecution(executionId: string): Promise<void> {
    const abortController = this.runningExecutions.get(executionId);
    if (abortController) {
      abortController.abort();
    }

    await this.storage.updateChainExecution(executionId, {
      status: 'cancelled',
      completedAt: new Date()
    });
  }

  // Utility methods
  async validateChain(chain: AgentChain): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!chain.steps || chain.steps.length === 0) {
      errors.push('Chain must have at least one step');
    }

    for (const step of chain.steps) {
      // Validate agent exists
      const agent = await this.storage.getAgent(step.agentId);
      if (!agent) {
        errors.push(`Agent ${step.agentId} not found for step ${step.name}`);
      }

      // Validate step configuration
      if (!step.name) {
        errors.push(`Step ${step.id} must have a name`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getChainAnalytics(chainId: string): Promise<{
    executionCount: number;
    successRate: number;
    averageDuration: number;
    commonErrors: Array<{ error: string; count: number }>;
  }> {
    const executions = await this.getChainExecutions(chainId);
    
    const executionCount = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const successRate = executionCount > 0 ? successfulExecutions / executionCount : 0;
    
    const completedExecutions = executions.filter(e => e.completedAt && e.startedAt);
    const totalDuration = completedExecutions.reduce((sum, e) => {
      return sum + (new Date(e.completedAt!).getTime() - new Date(e.startedAt).getTime());
    }, 0);
    const averageDuration = completedExecutions.length > 0 ? totalDuration / completedExecutions.length : 0;

    const errorCounts = new Map<string, number>();
    executions.filter(e => e.errorMessage).forEach(e => {
      const error = e.errorMessage!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      executionCount,
      successRate,
      averageDuration,
      commonErrors
    };
  }
}