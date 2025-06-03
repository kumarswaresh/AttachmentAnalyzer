import { randomUUID } from 'crypto';
import { storage } from '../storage';
import { vectorMemoryService } from './VectorMemoryService';
import { mcpConnectorService } from './MCPConnectorService';
import type { 
  AgentApp, 
  InsertAgentApp,
  AgentAppExecution,
  InsertAgentAppExecution,
  AgentFlowNode,
  AppGuardrail,
  GeoContext,
  UserProfile
} from '@shared/schema';

interface FlowExecutionContext {
  input: any;
  variables: Record<string, any>;
  geoContext?: GeoContext;
  userProfile?: UserProfile;
  nodeResults: Map<string, any>;
  currentNode?: string;
  executionPath: string[];
}

interface NodeExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  duration: number;
  nextNodes?: string[];
}

export class AgentAppBuilderService {
  
  // Create a new agent app
  async createAgentApp(
    appData: Omit<InsertAgentApp, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'avgExecutionTime'>
  ): Promise<AgentApp> {
    // Validate app configuration
    this.validateAppConfiguration(appData);
    
    const app = await storage.createAgentApp({
      ...appData,
      executionCount: 0,
      avgExecutionTime: 0
    });
    
    return app;
  }

  // Get all agent apps with filtering
  async getAgentApps(filters: {
    category?: string;
    isActive?: boolean;
    isPublic?: boolean;
    createdBy?: number;
  } = {}): Promise<AgentApp[]> {
    return await storage.getAgentApps(filters);
  }

  // Get agent app by ID
  async getAgentApp(id: string): Promise<AgentApp | null> {
    return await storage.getAgentApp(id);
  }

  // Update agent app
  async updateAgentApp(
    id: string,
    updates: Partial<InsertAgentApp>
  ): Promise<AgentApp> {
    if (updates.flowDefinition) {
      this.validateFlowDefinition(updates.flowDefinition);
    }
    
    return await storage.updateAgentApp(id, updates);
  }

  // Delete agent app
  async deleteAgentApp(id: string): Promise<void> {
    await storage.deleteAgentApp(id);
  }

  // Execute an agent app
  async executeAgentApp(
    appId: string,
    input: any,
    context: {
      geoContext?: GeoContext;
      userProfile?: UserProfile;
      variables?: Record<string, any>;
    } = {},
    executedBy?: number
  ): Promise<AgentAppExecution> {
    const app = await this.getAgentApp(appId);
    if (!app) {
      throw new Error(`Agent app ${appId} not found`);
    }

    if (!app.isActive) {
      throw new Error(`Agent app ${appId} is not active`);
    }

    // Create execution record
    const execution = await storage.createAgentAppExecution({
      appId,
      status: 'running',
      input,
      context: context.variables || {},
      geoContext: context.geoContext,
      userProfile: context.userProfile,
      executedBy
    });

    // Start execution in background
    this.processAppExecution(execution, app).catch(async (error) => {
      await storage.updateAgentAppExecution(execution.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        duration: Date.now() - new Date(execution.startedAt).getTime()
      });
    });

    return execution;
  }

  // Process agent app execution
  private async processAppExecution(
    execution: AgentAppExecution,
    app: AgentApp
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Apply guardrails
      await this.applyGuardrails(app.guardrails, execution.input, execution.geoContext, execution.userProfile);

      // Create execution context
      const context: FlowExecutionContext = {
        input: execution.input,
        variables: execution.context,
        geoContext: execution.geoContext || undefined,
        userProfile: execution.userProfile || undefined,
        nodeResults: new Map(),
        executionPath: []
      };

      // Execute flow
      const result = await this.executeFlow(app.flowDefinition, context);
      
      const duration = Date.now() - startTime;

      // Update execution record
      await storage.updateAgentAppExecution(execution.id, {
        status: 'completed',
        output: result,
        completedAt: new Date(),
        duration
      });

      // Update app statistics
      await this.updateAppStatistics(app.id, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      await storage.updateAgentAppExecution(execution.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
        duration
      });
    }
  }

  // Execute flow definition
  private async executeFlow(
    flowDefinition: AgentFlowNode[],
    context: FlowExecutionContext
  ): Promise<any> {
    // Find start node (first node or node with no inputs)
    const startNode = flowDefinition.find(node => 
      node.inputs.length === 0 || node.type === 'start'
    ) || flowDefinition[0];

    if (!startNode) {
      throw new Error('No start node found in flow definition');
    }

    return await this.executeNode(startNode, flowDefinition, context);
  }

  // Execute a single node in the flow
  private async executeNode(
    node: AgentFlowNode,
    flowDefinition: AgentFlowNode[],
    context: FlowExecutionContext
  ): Promise<any> {
    context.currentNode = node.id;
    context.executionPath.push(node.id);

    // Log execution start
    await vectorMemoryService.logExecution(
      `app-${Date.now()}`,
      node.id,
      'start',
      `Starting execution of ${node.type} node: ${node.name}`
    );

    let result: NodeExecutionResult;

    try {
      switch (node.type) {
        case 'agent':
          result = await this.executeAgentNode(node, context);
          break;
        case 'connector':
          result = await this.executeConnectorNode(node, context);
          break;
        case 'condition':
          result = await this.executeConditionNode(node, context);
          break;
        case 'parallel':
          result = await this.executeParallelNode(node, flowDefinition, context);
          break;
        case 'merge':
          result = await this.executeMergeNode(node, context);
          break;
        case 'memory':
          result = await this.executeMemoryNode(node, context);
          break;
        case 'transform':
          result = await this.executeTransformNode(node, context);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Store result
      context.nodeResults.set(node.id, result.output);

      // Log execution completion
      await vectorMemoryService.logExecution(
        `app-${Date.now()}`,
        node.id,
        'completion',
        `Completed execution of ${node.type} node: ${node.name}`,
        { output: result.output },
        result.duration
      );

      // Execute next nodes
      if (result.nextNodes && result.nextNodes.length > 0) {
        const nextResults = [];
        for (const nextNodeId of result.nextNodes) {
          const nextNode = flowDefinition.find(n => n.id === nextNodeId);
          if (nextNode) {
            const nextResult = await this.executeNode(nextNode, flowDefinition, context);
            nextResults.push(nextResult);
          }
        }
        
        // Return last result or merge results
        return nextResults.length === 1 ? nextResults[0] : nextResults;
      }

      return result.output;

    } catch (error) {
      await vectorMemoryService.logExecution(
        `app-${Date.now()}`,
        node.id,
        'error',
        `Error in ${node.type} node: ${node.name}`,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      throw error;
    }
  }

  // Execute agent node
  private async executeAgentNode(
    node: AgentFlowNode,
    context: FlowExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const agentId = node.config.agentId;
      const prompt = this.buildPromptFromContext(node.config.prompt || '', context);
      
      // Get agent and execute
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // This would integrate with your existing agent execution logic
      // For now, return a mock response
      const output = {
        response: `Agent ${agent.name} processed: ${prompt}`,
        agentId: agent.id,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
        nextNodes: node.outputs
      };

    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Agent execution failed',
        duration: Date.now() - startTime
      };
    }
  }

  // Execute connector node
  private async executeConnectorNode(
    node: AgentFlowNode,
    context: FlowExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const connectorId = node.config.connectorId;
      const endpoint = node.config.endpoint;
      const parameters = this.buildParametersFromContext(node.config.parameters || {}, context);
      
      const result = await mcpConnectorService.executeConnector(
        connectorId,
        endpoint,
        parameters
      );

      return {
        success: result.success,
        output: result.data,
        error: result.error,
        duration: result.duration,
        nextNodes: result.success ? node.outputs : []
      };

    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Connector execution failed',
        duration: Date.now() - startTime
      };
    }
  }

  // Execute condition node
  private async executeConditionNode(
    node: AgentFlowNode,
    context: FlowExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const conditions = node.conditions || [];
      const nextNodes: string[] = [];

      for (const condition of conditions) {
        const value = this.getValueFromContext(condition.field, context);
        const conditionMet = this.evaluateCondition(value, condition.operator, condition.value);
        
        if (conditionMet && condition.nextNode) {
          nextNodes.push(condition.nextNode);
        }
      }

      return {
        success: true,
        output: { conditionsEvaluated: conditions.length, nextNodes },
        duration: Date.now() - startTime,
        nextNodes
      };

    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Condition evaluation failed',
        duration: Date.now() - startTime
      };
    }
  }

  // Execute parallel node
  private async executeParallelNode(
    node: AgentFlowNode,
    flowDefinition: AgentFlowNode[],
    context: FlowExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const parallelNodes = node.outputs.map(nodeId => 
        flowDefinition.find(n => n.id === nodeId)
      ).filter(Boolean);

      const results = await Promise.all(
        parallelNodes.map(parallelNode => 
          this.executeNode(parallelNode!, flowDefinition, { ...context })
        )
      );

      return {
        success: true,
        output: results,
        duration: Date.now() - startTime,
        nextNodes: []
      };

    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Parallel execution failed',
        duration: Date.now() - startTime
      };
    }
  }

  // Execute merge node
  private async executeMergeNode(
    node: AgentFlowNode,
    context: FlowExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const inputResults = node.inputs.map(inputId => 
        context.nodeResults.get(inputId)
      ).filter(Boolean);

      const mergedOutput = node.config.mergeStrategy === 'concat' 
        ? inputResults.flat()
        : { ...Object.assign({}, ...inputResults) };

      return {
        success: true,
        output: mergedOutput,
        duration: Date.now() - startTime,
        nextNodes: node.outputs
      };

    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Merge failed',
        duration: Date.now() - startTime
      };
    }
  }

  // Execute memory node
  private async executeMemoryNode(
    node: AgentFlowNode,
    context: FlowExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const operation = node.config.operation; // 'store' or 'retrieve'
      const agentId = node.config.agentId;
      
      if (operation === 'store') {
        const content = this.getValueFromContext(node.config.contentField, context);
        const memoryType = node.config.memoryType || 'context';
        
        await vectorMemoryService.storeMemory(
          agentId,
          String(content),
          memoryType,
          undefined,
          node.config.importance || 1,
          node.config.tags || []
        );

        return {
          success: true,
          output: { stored: true, content },
          duration: Date.now() - startTime,
          nextNodes: node.outputs
        };

      } else if (operation === 'retrieve') {
        const query = this.getValueFromContext(node.config.queryField, context);
        const memories = await vectorMemoryService.searchMemories(
          agentId,
          String(query),
          node.config.threshold || 0.7,
          node.config.limit || 5
        );

        return {
          success: true,
          output: { memories },
          duration: Date.now() - startTime,
          nextNodes: node.outputs
        };
      }

      throw new Error(`Unknown memory operation: ${operation}`);

    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Memory operation failed',
        duration: Date.now() - startTime
      };
    }
  }

  // Execute transform node
  private async executeTransformNode(
    node: AgentFlowNode,
    context: FlowExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const inputValue = this.getValueFromContext(node.config.inputField, context);
      const transformType = node.config.transformType;
      
      let output;
      
      switch (transformType) {
        case 'format':
          output = this.formatValue(inputValue, node.config.format);
          break;
        case 'filter':
          output = this.filterValue(inputValue, node.config.filterCriteria);
          break;
        case 'aggregate':
          output = this.aggregateValue(inputValue, node.config.aggregateFunction);
          break;
        default:
          output = inputValue;
      }

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
        nextNodes: node.outputs
      };

    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Transform failed',
        duration: Date.now() - startTime
      };
    }
  }

  // Helper methods
  private buildPromptFromContext(template: string, context: FlowExecutionContext): string {
    let prompt = template;
    
    // Replace variables
    for (const [key, value] of Object.entries(context.variables)) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    // Replace input
    prompt = prompt.replace(/{{input}}/g, JSON.stringify(context.input));
    
    return prompt;
  }

  private buildParametersFromContext(parameterTemplate: Record<string, any>, context: FlowExecutionContext): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(parameterTemplate)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const field = value.slice(2, -2);
        parameters[key] = this.getValueFromContext(field, context);
      } else {
        parameters[key] = value;
      }
    }
    
    return parameters;
  }

  private getValueFromContext(field: string, context: FlowExecutionContext): any {
    if (field === 'input') return context.input;
    if (field.startsWith('variables.')) {
      const varName = field.slice(10);
      return context.variables[varName];
    }
    if (field.startsWith('node.')) {
      const nodeId = field.slice(5);
      return context.nodeResults.get(nodeId);
    }
    if (field.startsWith('geo.')) {
      const geoField = field.slice(4);
      return context.geoContext?.[geoField as keyof GeoContext];
    }
    if (field.startsWith('user.')) {
      const userField = field.slice(5);
      return context.userProfile?.[userField as keyof UserProfile];
    }
    
    return undefined;
  }

  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case '==': return value == expected;
      case '!=': return value != expected;
      case '>': return value > expected;
      case '<': return value < expected;
      case 'contains': return String(value).includes(String(expected));
      case 'exists': return value !== undefined && value !== null;
      default: return false;
    }
  }

  private formatValue(value: any, format: string): any {
    // Simple formatting logic
    if (format === 'json') return JSON.stringify(value);
    if (format === 'string') return String(value);
    if (format === 'number') return Number(value);
    return value;
  }

  private filterValue(value: any, criteria: any): any {
    if (Array.isArray(value)) {
      return value.filter(item => {
        for (const [key, expectedValue] of Object.entries(criteria)) {
          if (item[key] !== expectedValue) return false;
        }
        return true;
      });
    }
    return value;
  }

  private aggregateValue(value: any, func: string): any {
    if (Array.isArray(value)) {
      switch (func) {
        case 'count': return value.length;
        case 'sum': return value.reduce((a, b) => a + b, 0);
        case 'avg': return value.reduce((a, b) => a + b, 0) / value.length;
        case 'max': return Math.max(...value);
        case 'min': return Math.min(...value);
      }
    }
    return value;
  }

  private async applyGuardrails(
    guardrails: AppGuardrail[],
    input: any,
    geoContext?: GeoContext | null,
    userProfile?: UserProfile | null
  ): Promise<void> {
    for (const guardrail of guardrails.filter(g => g.enabled)) {
      switch (guardrail.type) {
        case 'input_validation':
          this.validateInput(input, guardrail.config);
          break;
        case 'rate_limit':
          await this.checkRateLimit(guardrail.config);
          break;
        case 'content_safety':
          this.checkContentSafety(input, guardrail.config);
          break;
        case 'data_privacy':
          this.checkDataPrivacy(input, geoContext, userProfile, guardrail.config);
          break;
      }
    }
  }

  private validateInput(input: any, config: any): void {
    // Basic input validation
    if (config.required && !input) {
      throw new Error('Input is required');
    }
    if (config.maxLength && String(input).length > config.maxLength) {
      throw new Error(`Input exceeds maximum length of ${config.maxLength}`);
    }
  }

  private async checkRateLimit(config: any): Promise<void> {
    // Rate limiting logic would be implemented here
    // For now, just log
    console.log('Rate limit check:', config);
  }

  private checkContentSafety(input: any, config: any): void {
    // Content safety checks would be implemented here
    const content = String(input).toLowerCase();
    const blockedWords = config.blockedWords || [];
    
    for (const word of blockedWords) {
      if (content.includes(word.toLowerCase())) {
        throw new Error(`Content contains blocked word: ${word}`);
      }
    }
  }

  private checkDataPrivacy(
    input: any,
    geoContext?: GeoContext | null,
    userProfile?: UserProfile | null,
    config?: any
  ): void {
    // Data privacy checks would be implemented here
    console.log('Data privacy check:', { input, geoContext, userProfile, config });
  }

  private validateAppConfiguration(config: Partial<InsertAgentApp>): void {
    if (!config.name?.trim()) {
      throw new Error('App name is required');
    }
    
    if (!config.flowDefinition || config.flowDefinition.length === 0) {
      throw new Error('Flow definition is required');
    }
    
    this.validateFlowDefinition(config.flowDefinition);
  }

  private validateFlowDefinition(flowDefinition: AgentFlowNode[]): void {
    // Check for at least one start node
    const hasStartNode = flowDefinition.some(node => 
      node.inputs.length === 0 || node.type === 'start'
    );
    
    if (!hasStartNode) {
      throw new Error('Flow must have at least one start node');
    }
    
    // Validate node IDs are unique
    const nodeIds = flowDefinition.map(node => node.id);
    const uniqueIds = new Set(nodeIds);
    
    if (nodeIds.length !== uniqueIds.size) {
      throw new Error('All node IDs must be unique');
    }
    
    // Validate connections
    for (const node of flowDefinition) {
      for (const outputId of node.outputs) {
        const targetNode = flowDefinition.find(n => n.id === outputId);
        if (!targetNode) {
          throw new Error(`Node ${node.id} references non-existent output node ${outputId}`);
        }
      }
    }
  }

  private async updateAppStatistics(appId: string, duration: number): Promise<void> {
    const app = await storage.getAgentApp(appId);
    if (!app) return;
    
    const newExecutionCount = app.executionCount + 1;
    const newAvgExecutionTime = app.avgExecutionTime 
      ? Math.round((app.avgExecutionTime * app.executionCount + duration) / newExecutionCount)
      : duration;
    
    await storage.updateAgentApp(appId, {
      executionCount: newExecutionCount,
      avgExecutionTime: newAvgExecutionTime
    });
  }
}

export const agentAppBuilderService = new AgentAppBuilderService();