import { db } from "../db";
import { 
  agentMessages, 
  agentCommunicationChannels, 
  agentCoordinationRules, 
  agents,
  chainExecutions 
} from "@shared/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import type { 
  AgentMessageContent, 
  AgentCommunicationState, 
  CoordinationTrigger, 
  CoordinationAction 
} from "@shared/schema";

export class AgentCommunicationService {
  private agentStates = new Map<string, AgentCommunicationState>();
  private messageQueue = new Map<string, any[]>();

  // Send message between agents
  async sendMessage(
    fromAgentId: string | null,
    toAgentId: string,
    messageType: string,
    content: AgentMessageContent,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      responseRequired?: boolean;
      responseTimeout?: number;
      chainExecutionId?: string;
      correlationId?: string;
    } = {}
  ) {
    try {
      const messageId = await db.insert(agentMessages).values({
        fromAgentId,
        toAgentId,
        messageType,
        content,
        priority: options.priority || 'medium',
        responseRequired: options.responseRequired || false,
        responseTimeout: options.responseTimeout,
        chainExecutionId: options.chainExecutionId,
        correlationId: options.correlationId,
        metadata: {
          sentAt: new Date().toISOString(),
          retryCount: 0
        }
      }).returning({ id: agentMessages.id });

      // Update agent communication state
      await this.updateAgentActivity(toAgentId);
      
      // Process coordination rules
      await this.processCoordinationRules('message_received', {
        messageId: messageId[0].id,
        fromAgentId,
        toAgentId,
        messageType,
        content
      });

      return messageId[0].id;
    } catch (error) {
      console.error('Failed to send agent message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Get messages for an agent
  async getAgentMessages(
    agentId: string,
    filters: {
      messageType?: string;
      status?: string;
      fromDate?: Date;
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ) {
    try {
      let query = db.select().from(agentMessages).where(eq(agentMessages.toAgentId, agentId));

      if (filters.status) {
        query = query.where(eq(agentMessages.status, filters.status));
      }

      if (filters.messageType) {
        query = query.where(eq(agentMessages.messageType, filters.messageType));
      }

      if (filters.unreadOnly) {
        query = query.where(eq(agentMessages.status, 'pending'));
      }

      const messages = await query
        .orderBy(desc(agentMessages.timestamp))
        .limit(filters.limit || 100);

      return messages;
    } catch (error) {
      console.error('Failed to get agent messages:', error);
      throw new Error('Failed to retrieve messages');
    }
  }

  // Mark message as processed
  async markMessageProcessed(messageId: string, response?: any) {
    try {
      await db.update(agentMessages)
        .set({
          status: 'processed',
          processedAt: new Date(),
          metadata: { processedAt: new Date().toISOString(), response }
        })
        .where(eq(agentMessages.id, messageId));
    } catch (error) {
      console.error('Failed to mark message as processed:', error);
      throw new Error('Failed to update message status');
    }
  }

  // Create communication channel
  async createCommunicationChannel(
    name: string,
    channelType: 'broadcast' | 'group' | 'direct' | 'workflow',
    participantAgents: string[],
    moderatorAgent?: string,
    configuration: Record<string, any> = {},
    createdBy: number
  ) {
    try {
      const channel = await db.insert(agentCommunicationChannels).values({
        name,
        channelType,
        participantAgents,
        moderatorAgent,
        configuration,
        createdBy
      }).returning();

      return channel[0];
    } catch (error) {
      console.error('Failed to create communication channel:', error);
      throw new Error('Failed to create channel');
    }
  }

  // Broadcast message to channel
  async broadcastToChannel(
    channelId: string,
    fromAgentId: string | null,
    messageType: string,
    content: AgentMessageContent,
    options: { priority?: string; responseRequired?: boolean } = {}
  ) {
    try {
      // Get channel participants
      const channel = await db.select().from(agentCommunicationChannels)
        .where(eq(agentCommunicationChannels.id, channelId));

      if (!channel[0]) {
        throw new Error('Channel not found');
      }

      const participants = channel[0].participantAgents;
      const messageIds = [];

      // Send message to all participants
      for (const participantId of participants) {
        if (participantId !== fromAgentId) {
          const messageId = await this.sendMessage(
            fromAgentId,
            participantId,
            messageType,
            content,
            options
          );
          messageIds.push(messageId);
        }
      }

      return messageIds;
    } catch (error) {
      console.error('Failed to broadcast to channel:', error);
      throw new Error('Failed to broadcast message');
    }
  }

  // Process coordination rules
  async processCoordinationRules(
    triggerType: string,
    triggerData: Record<string, any>
  ) {
    try {
      const rules = await db.select().from(agentCoordinationRules)
        .where(eq(agentCoordinationRules.isActive, true))
        .orderBy(desc(agentCoordinationRules.priority));

      for (const rule of rules) {
        const triggers = rule.triggerConditions as CoordinationTrigger[];
        const actions = rule.actions as CoordinationAction[];

        // Check if trigger conditions match
        for (const trigger of triggers) {
          if (trigger.type === triggerType && this.evaluateTriggerConditions(trigger, triggerData)) {
            // Execute actions
            for (const action of actions) {
              await this.executeCoordinationAction(action, triggerData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to process coordination rules:', error);
    }
  }

  // Execute coordination action
  private async executeCoordinationAction(
    action: CoordinationAction,
    triggerData: Record<string, any>
  ) {
    switch (action.type) {
      case 'send_message':
        if (action.targetAgents && action.parameters.content) {
          for (const agentId of action.targetAgents) {
            await this.sendMessage(
              null,
              agentId,
              'coordination',
              action.parameters.content,
              { priority: action.parameters.priority || 'medium' }
            );
          }
        }
        break;

      case 'notify_agents':
        if (action.targetAgents) {
          for (const agentId of action.targetAgents) {
            await this.sendMessage(
              null,
              agentId,
              'notification',
              {
                body: action.parameters.message || 'Coordination notification',
                data: triggerData
              },
              { priority: 'high' }
            );
          }
        }
        break;

      case 'escalate':
        if (action.parameters.escalationAgent) {
          await this.sendMessage(
            null,
            action.parameters.escalationAgent,
            'escalation',
            {
              body: 'Issue escalated from automated coordination',
              data: triggerData
            },
            { priority: 'urgent', responseRequired: true }
          );
        }
        break;

      default:
        console.log(`Coordination action ${action.type} not implemented`);
    }
  }

  // Evaluate trigger conditions
  private evaluateTriggerConditions(
    trigger: CoordinationTrigger,
    triggerData: Record<string, any>
  ): boolean {
    // Simple condition evaluation - can be enhanced with more complex logic
    for (const [key, expectedValue] of Object.entries(trigger.conditions)) {
      if (triggerData[key] !== expectedValue) {
        return false;
      }
    }
    return true;
  }

  // Update agent activity
  private async updateAgentActivity(agentId: string) {
    const currentState = this.agentStates.get(agentId) || {
      agentId,
      status: 'available',
      messageQueue: [],
      lastActivity: new Date(),
      capabilities: [],
      workload: 0
    };

    currentState.lastActivity = new Date();
    this.agentStates.set(agentId, currentState);
  }

  // Get agent communication state
  getAgentState(agentId: string): AgentCommunicationState | undefined {
    return this.agentStates.get(agentId);
  }

  // Set agent status
  async setAgentStatus(
    agentId: string,
    status: 'available' | 'busy' | 'offline' | 'error',
    currentTask?: string
  ) {
    const currentState = this.agentStates.get(agentId) || {
      agentId,
      status: 'available',
      messageQueue: [],
      lastActivity: new Date(),
      capabilities: [],
      workload: 0
    };

    currentState.status = status;
    currentState.currentTask = currentTask;
    currentState.lastActivity = new Date();

    this.agentStates.set(agentId, currentState);

    // Process coordination rules for status change
    await this.processCoordinationRules('agent_status_change', {
      agentId,
      status,
      currentTask,
      timestamp: new Date().toISOString()
    });
  }

  // Get communication statistics
  async getCommunicationStats(agentId?: string) {
    try {
      let query = db.select().from(agentMessages);
      
      if (agentId) {
        query = query.where(
          and(
            eq(agentMessages.toAgentId, agentId),
            eq(agentMessages.fromAgentId, agentId)
          )
        );
      }

      const messages = await query;
      
      const stats = {
        totalMessages: messages.length,
        pendingMessages: messages.filter(m => m.status === 'pending').length,
        processedMessages: messages.filter(m => m.status === 'processed').length,
        failedMessages: messages.filter(m => m.status === 'failed').length,
        messagesByType: {} as Record<string, number>,
        messagesByPriority: {} as Record<string, number>
      };

      // Calculate type and priority distributions
      messages.forEach(msg => {
        stats.messagesByType[msg.messageType] = (stats.messagesByType[msg.messageType] || 0) + 1;
        stats.messagesByPriority[msg.priority] = (stats.messagesByPriority[msg.priority] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get communication stats:', error);
      throw new Error('Failed to retrieve communication statistics');
    }
  }
}

export const agentCommunicationService = new AgentCommunicationService();