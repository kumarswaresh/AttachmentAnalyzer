import { storage } from '../storage';
import { nanoid } from 'nanoid';
import type { Agent, AgentMessage, ChainExecution, AgentChain } from '@shared/schema';

export interface CommunicationProtocol {
  type: 'direct' | 'queued' | 'broadcast' | 'conditional';
  retryCount?: number;
  timeout?: number;
  priority?: number;
}

export interface MessagePayload {
  type: 'task' | 'result' | 'error' | 'context' | 'handoff';
  data: any;
  metadata?: Record<string, any>;
}

export interface ChainStep {
  id: string;
  name: string;
  agentId: string;
  condition?: string;
  inputMapping?: Record<string, any>;
  outputMapping?: Record<string, any>;
  timeout?: number;
  retryCount?: number;
  parallel?: boolean;
}

export class AgentCommunicationService {
  private messageQueue: Map<string, AgentMessage[]> = new Map();
  private activeExecutions: Map<string, ChainExecution> = new Map();

  async sendMessage(
    fromAgentId: string,
    toAgentId: string,
    payload: MessagePayload,
    protocol: CommunicationProtocol = { type: 'direct' },
    chainExecutionId?: string
  ): Promise<string> {
    const messageId = nanoid();

    const message = await storage.createAgentMessage({
      id: messageId,
      chainExecutionId,
      fromAgentId,
      toAgentId,
      messageType: payload.type,
      content: payload.data,
      status: 'pending',
      priority: protocol.priority || 1,
      metadata: {
        protocol,
        ...payload.metadata
      }
    });

    // Add to agent's message queue
    if (!this.messageQueue.has(toAgentId)) {
      this.messageQueue.set(toAgentId, []);
    }
    this.messageQueue.get(toAgentId)!.push(message);

    // Process message based on protocol
    await this.processMessage(message, protocol);

    return messageId;
  }

  async broadcastMessage(
    fromAgentId: string,
    agentIds: string[],
    payload: MessagePayload,
    protocol: CommunicationProtocol = { type: 'broadcast' }
  ): Promise<string[]> {
    const messageIds: string[] = [];

    for (const toAgentId of agentIds) {
      const messageId = await this.sendMessage(fromAgentId, toAgentId, payload, protocol);
      messageIds.push(messageId);
    }

    return messageIds;
  }

  async getMessages(agentId: string, options?: {
    messageType?: string;
    status?: string;
    limit?: number;
  }): Promise<AgentMessage[]> {
    return await storage.getAgentMessages(agentId, options);
  }

  async processMessage(message: AgentMessage, protocol: CommunicationProtocol): Promise<void> {
    try {
      // Mark message as delivered
      await storage.updateAgentMessage(message.id, {
        status: 'delivered',
        processedAt: new Date()
      });

      // Handle different message types
      switch (message.messageType) {
        case 'task':
          await this.handleTaskMessage(message);
          break;
        case 'result':
          await this.handleResultMessage(message);
          break;
        case 'handoff':
          await this.handleHandoffMessage(message);
          break;
        case 'error':
          await this.handleErrorMessage(message);
          break;
      }

      // Mark as processed
      await storage.updateAgentMessage(message.id, { status: 'processed' });

    } catch (error) {
      console.error('Error processing message:', error);
      await storage.updateAgentMessage(message.id, { 
        status: 'failed',
        metadata: { ...message.metadata, error: (error as Error).message }
      });

      // Retry if configured
      if (protocol.retryCount && protocol.retryCount > 0) {
        setTimeout(() => {
          this.processMessage(message, { ...protocol, retryCount: protocol.retryCount! - 1 });
        }, 1000);
      }
    }
  }

  private async handleTaskMessage(message: AgentMessage): Promise<void> {
    // Delegate task to target agent
    const agent = await storage.getAgent(message.toAgentId);
    if (!agent) {
      throw new Error(`Agent ${message.toAgentId} not found`);
    }

    // Execute agent with task data
    // This would integrate with the agent execution service
    console.log(`Executing task on agent ${agent.name}:`, message.content);
  }

  private async handleResultMessage(message: AgentMessage): Promise<void> {
    // Handle result from agent execution
    if (message.chainExecutionId) {
      const execution = await storage.getChainExecution(message.chainExecutionId);
      if (execution) {
        // Update chain execution with result
        await this.updateChainExecution(execution, message);
      }
    }
  }

  private async handleHandoffMessage(message: AgentMessage): Promise<void> {
    // Transfer control from one agent to another
    const handoffData = message.content as {
      context: any;
      nextAction: string;
      priority: number;
    };

    // Create new task for receiving agent
    await this.sendMessage(
      message.fromAgentId!,
      message.toAgentId,
      {
        type: 'task',
        data: {
          action: handoffData.nextAction,
          context: handoffData.context
        }
      },
      { type: 'direct', priority: handoffData.priority }
    );
  }

  private async handleErrorMessage(message: AgentMessage): Promise<void> {
    // Handle error from agent execution
    console.error(`Agent ${message.fromAgentId} reported error:`, message.content);
    
    if (message.chainExecutionId) {
      await storage.updateChainExecution(message.chainExecutionId, {
        status: 'failed',
        output: { error: message.content },
        endedAt: new Date()
      });
    }
  }

  // Chain Execution Methods
  async executeChain(chainId: string, input: any, variables?: Record<string, any>): Promise<string> {
    const chain = await storage.getAgentChain(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }

    const executionId = nanoid();
    const execution = await storage.createChainExecution({
      id: executionId,
      chainId,
      status: 'running',
      currentStep: 0,
      input,
      variables: variables || {},
      startedAt: new Date()
    });

    this.activeExecutions.set(executionId, execution);

    // Start executing chain steps
    await this.executeNextStep(execution, chain);

    return executionId;
  }

  private async executeNextStep(execution: ChainExecution, chain: AgentChain): Promise<void> {
    const steps = chain.steps as ChainStep[];
    
    if (execution.currentStep >= steps.length) {
      // Chain completed
      await storage.updateChainExecution(execution.id, {
        status: 'completed',
        endedAt: new Date()
      });
      this.activeExecutions.delete(execution.id);
      return;
    }

    const currentStep = steps[execution.currentStep];
    
    try {
      // Check step condition if present
      if (currentStep.condition && !this.evaluateCondition(currentStep.condition, execution)) {
        // Skip this step
        await this.moveToNextStep(execution, chain);
        return;
      }

      // Prepare input for agent
      const stepInput = this.mapInput(currentStep.inputMapping, execution.input, execution.variables);

      // Execute step
      await this.executeStep(currentStep, stepInput, execution.id);

    } catch (error) {
      console.error(`Error executing step ${currentStep.name}:`, error);
      await storage.updateChainExecution(execution.id, {
        status: 'failed',
        output: { error: (error as Error).message, step: currentStep.name },
        endedAt: new Date()
      });
      this.activeExecutions.delete(execution.id);
    }
  }

  private async executeStep(step: ChainStep, input: any, executionId: string): Promise<void> {
    // Send task message to agent
    await this.sendMessage(
      'system', // System as sender
      step.agentId,
      {
        type: 'task',
        data: {
          stepId: step.id,
          stepName: step.name,
          input,
          executionId
        }
      },
      {
        type: 'direct',
        timeout: step.timeout || 30000,
        retryCount: step.retryCount || 1
      },
      executionId
    );
  }

  private async moveToNextStep(execution: ChainExecution, chain: AgentChain): Promise<void> {
    const updatedExecution = await storage.updateChainExecution(execution.id, {
      currentStep: execution.currentStep + 1
    });

    await this.executeNextStep(updatedExecution, chain);
  }

  private async updateChainExecution(execution: ChainExecution, message: AgentMessage): Promise<void> {
    const result = message.content;
    
    // Map output if configured
    const steps = execution.variables?.steps as ChainStep[] || [];
    const currentStep = steps[execution.currentStep];
    
    let mappedOutput = result;
    if (currentStep?.outputMapping) {
      mappedOutput = this.mapOutput(currentStep.outputMapping, result);
    }

    // Update execution output and move to next step
    const updatedExecution = await storage.updateChainExecution(execution.id, {
      output: { ...execution.output, [currentStep?.name || 'step']: mappedOutput },
      currentStep: execution.currentStep + 1
    });

    // Continue chain execution
    const chain = await storage.getAgentChain(execution.chainId);
    if (chain) {
      await this.executeNextStep(updatedExecution, chain);
    }
  }

  private evaluateCondition(condition: string, execution: ChainExecution): boolean {
    try {
      // Simple condition evaluation - can be enhanced with a proper expression parser
      const context = {
        input: execution.input,
        output: execution.output,
        variables: execution.variables,
        currentStep: execution.currentStep
      };

      // Basic condition evaluation (replace with proper parser in production)
      return new Function('context', `with(context) { return ${condition}; }`)(context);
    } catch {
      return false;
    }
  }

  private mapInput(mapping: Record<string, any> | undefined, input: any, variables: any): any {
    if (!mapping) return input;

    const mapped: any = {};
    for (const [key, value] of Object.entries(mapping)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Variable reference
        const path = value.substring(1);
        mapped[key] = this.getNestedValue({ input, variables }, path);
      } else {
        mapped[key] = value;
      }
    }
    return mapped;
  }

  private mapOutput(mapping: Record<string, any>, output: any): any {
    const mapped: any = {};
    for (const [key, value] of Object.entries(mapping)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        const path = value.substring(1);
        mapped[key] = this.getNestedValue(output, path);
      } else {
        mapped[key] = value;
      }
    }
    return mapped;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Communication Analytics
  async getCommunicationStats(agentId?: string): Promise<any> {
    const messages = await storage.getAgentMessages(agentId || '', { limit: 1000 });
    
    const stats = {
      totalMessages: messages.length,
      messagesByType: {} as Record<string, number>,
      messagesByStatus: {} as Record<string, number>,
      averageProcessingTime: 0,
      errorRate: 0
    };

    let totalProcessingTime = 0;
    let processedCount = 0;
    let errorCount = 0;

    messages.forEach(msg => {
      // Count by type
      stats.messagesByType[msg.messageType] = (stats.messagesByType[msg.messageType] || 0) + 1;
      
      // Count by status
      stats.messagesByStatus[msg.status] = (stats.messagesByStatus[msg.status] || 0) + 1;

      // Calculate processing time
      if (msg.processedAt && msg.timestamp) {
        totalProcessingTime += new Date(msg.processedAt).getTime() - new Date(msg.timestamp).getTime();
        processedCount++;
      }

      // Count errors
      if (msg.status === 'failed') {
        errorCount++;
      }
    });

    if (processedCount > 0) {
      stats.averageProcessingTime = totalProcessingTime / processedCount;
    }

    if (messages.length > 0) {
      stats.errorRate = (errorCount / messages.length) * 100;
    }

    return stats;
  }
}

export const agentCommunicationService = new AgentCommunicationService();