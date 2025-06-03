import { db } from "../db";
import { agentApps, appExecutions } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type { InsertAgentApp, InsertAppExecution, AgentApp } from "@shared/schema";

export interface AppNode {
  id: string;
  type: 'agent' | 'condition' | 'input' | 'output' | 'transform';
  position: { x: number; y: number };
  data: {
    label: string;
    agentId?: string;
    condition?: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
    transform?: string;
  };
}

export interface AppEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    condition?: string;
    mapping?: Record<string, string>;
  };
}

export class AgentAppBuilderService {
  
  async createApp(appData: {
    name: string;
    description: string;
    nodes: AppNode[];
    edges: AppEdge[];
    config?: Record<string, any>;
    isPublic?: boolean;
  }): Promise<AgentApp> {
    try {
      // Validate the app structure
      this.validateAppStructure(appData.nodes, appData.edges);

      const insertData: InsertAgentApp = {
        name: appData.name,
        description: appData.description,
        flowDefinition: {
          nodes: appData.nodes,
          edges: appData.edges
        },
        config: appData.config || {},
        isPublic: appData.isPublic || false,
        isActive: true
      };

      const [app] = await db.insert(agentApps)
        .values(insertData)
        .returning();

      return app;
    } catch (error) {
      console.error("Failed to create agent app:", error);
      throw error;
    }
  }

  async getAllApps(): Promise<AgentApp[]> {
    try {
      return await db.select()
        .from(agentApps)
        .where(eq(agentApps.isActive, true))
        .orderBy(desc(agentApps.createdAt));
    } catch (error) {
      console.error("Failed to get agent apps:", error);
      return [];
    }
  }

  async getPublicApps(): Promise<AgentApp[]> {
    try {
      return await db.select()
        .from(agentApps)
        .where(
          and(
            eq(agentApps.isActive, true),
            eq(agentApps.isPublic, true)
          )!
        )
        .orderBy(desc(agentApps.createdAt));
    } catch (error) {
      console.error("Failed to get public apps:", error);
      return [];
    }
  }

  async getAppById(id: number): Promise<AgentApp | null> {
    try {
      const [app] = await db.select()
        .from(agentApps)
        .where(eq(agentApps.id, id));
      
      return app || null;
    } catch (error) {
      console.error("Failed to get app:", error);
      return null;
    }
  }

  async updateApp(
    id: number,
    updates: Partial<InsertAgentApp>
  ): Promise<AgentApp> {
    try {
      if (updates.flowDefinition) {
        const flow = updates.flowDefinition as { nodes: AppNode[]; edges: AppEdge[] };
        this.validateAppStructure(flow.nodes, flow.edges);
      }

      const [app] = await db.update(agentApps)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(agentApps.id, id))
        .returning();

      return app;
    } catch (error) {
      console.error("Failed to update app:", error);
      throw error;
    }
  }

  async executeApp(
    appId: number,
    inputData: Record<string, any>,
    executionContext?: Record<string, any>
  ): Promise<{
    executionId: number;
    status: 'running' | 'completed' | 'failed';
    results?: Record<string, any>;
    error?: string;
  }> {
    try {
      const app = await this.getAppById(appId);
      if (!app) {
        throw new Error("App not found");
      }

      // Create execution record
      const executionData: InsertAppExecution = {
        appId,
        inputData,
        executionContext: executionContext || {},
        status: 'running'
      };

      const [execution] = await db.insert(appExecutions)
        .values(executionData)
        .returning();

      try {
        // Execute the app flow
        const results = await this.executeAppFlow(app, inputData, executionContext);
        
        // Update execution with results
        await db.update(appExecutions)
          .set({
            status: 'completed',
            results,
            completedAt: new Date()
          })
          .where(eq(appExecutions.id, execution.id));

        return {
          executionId: execution.id,
          status: 'completed',
          results
        };
      } catch (error: any) {
        // Update execution with error
        await db.update(appExecutions)
          .set({
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date()
          })
          .where(eq(appExecutions.id, execution.id));

        return {
          executionId: execution.id,
          status: 'failed',
          error: error.message
        };
      }
    } catch (error: any) {
      console.error("Failed to execute app:", error);
      return {
        executionId: 0,
        status: 'failed',
        error: error.message
      };
    }
  }

  private async executeAppFlow(
    app: AgentApp,
    inputData: Record<string, any>,
    context?: Record<string, any>
  ): Promise<Record<string, any>> {
    const flow = app.flowDefinition as { nodes: AppNode[]; edges: AppEdge[] };
    const nodeResults: Record<string, any> = {};
    const executionState = { ...inputData, ...context };

    // Find entry points (nodes with no incoming edges)
    const entryNodes = flow.nodes.filter(node => 
      !flow.edges.some(edge => edge.target === node.id)
    );

    if (entryNodes.length === 0) {
      throw new Error("No entry points found in app flow");
    }

    // Execute nodes in topological order
    for (const entryNode of entryNodes) {
      await this.executeNode(entryNode, flow, nodeResults, executionState);
    }

    return nodeResults;
  }

  private async executeNode(
    node: AppNode,
    flow: { nodes: AppNode[]; edges: AppEdge[] },
    nodeResults: Record<string, any>,
    executionState: Record<string, any>
  ): Promise<void> {
    if (nodeResults[node.id]) {
      return; // Already executed
    }

    // Execute based on node type
    let result: any = null;

    switch (node.type) {
      case 'input':
        result = this.processInputNode(node, executionState);
        break;
      case 'agent':
        result = await this.processAgentNode(node, executionState);
        break;
      case 'condition':
        result = this.processConditionNode(node, executionState);
        break;
      case 'transform':
        result = this.processTransformNode(node, executionState);
        break;
      case 'output':
        result = this.processOutputNode(node, executionState);
        break;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    nodeResults[node.id] = result;

    // Update execution state with node result
    if (result && typeof result === 'object') {
      Object.assign(executionState, result);
    }

    // Execute connected nodes
    const outgoingEdges = flow.edges.filter(edge => edge.source === node.id);
    for (const edge of outgoingEdges) {
      const targetNode = flow.nodes.find(n => n.id === edge.target);
      if (targetNode) {
        // Check edge conditions
        if (this.shouldExecuteEdge(edge, result, executionState)) {
          await this.executeNode(targetNode, flow, nodeResults, executionState);
        }
      }
    }
  }

  private processInputNode(node: AppNode, state: Record<string, any>): any {
    // Extract input data based on node configuration
    const inputSchema = node.data.inputSchema;
    if (inputSchema && inputSchema.properties) {
      const result: Record<string, any> = {};
      for (const [key, schema] of Object.entries(inputSchema.properties)) {
        if (key in state) {
          result[key] = state[key];
        }
      }
      return result;
    }
    return state;
  }

  private async processAgentNode(node: AppNode, state: Record<string, any>): Promise<any> {
    // This would integrate with the agent execution system
    // For now, return a placeholder result
    return {
      agentResponse: `Response from agent ${node.data.agentId}`,
      timestamp: new Date().toISOString()
    };
  }

  private processConditionNode(node: AppNode, state: Record<string, any>): any {
    const condition = node.data.condition;
    if (!condition) {
      return { result: true };
    }

    try {
      // Simple condition evaluation (in production, use a safe expression evaluator)
      const result = this.evaluateCondition(condition, state);
      return { result };
    } catch (error) {
      return { result: false, error: error.message };
    }
  }

  private processTransformNode(node: AppNode, state: Record<string, any>): any {
    const transform = node.data.transform;
    if (!transform) {
      return state;
    }

    try {
      // Simple transformation (in production, use a safe expression evaluator)
      return this.applyTransform(transform, state);
    } catch (error) {
      return { error: error.message };
    }
  }

  private processOutputNode(node: AppNode, state: Record<string, any>): any {
    const outputSchema = node.data.outputSchema;
    if (outputSchema && outputSchema.properties) {
      const result: Record<string, any> = {};
      for (const key of Object.keys(outputSchema.properties)) {
        if (key in state) {
          result[key] = state[key];
        }
      }
      return result;
    }
    return state;
  }

  private shouldExecuteEdge(edge: AppEdge, nodeResult: any, state: Record<string, any>): boolean {
    if (!edge.data?.condition) {
      return true;
    }

    try {
      return this.evaluateCondition(edge.data.condition, { ...state, nodeResult });
    } catch (error) {
      console.error("Edge condition evaluation error:", error);
      return false;
    }
  }

  private evaluateCondition(condition: string, state: Record<string, any>): boolean {
    // Simple condition evaluation - in production, use a proper expression evaluator
    // This is a basic implementation for demonstration
    try {
      const cleanCondition = condition.replace(/[^a-zA-Z0-9\s><=!&|().,]/g, '');
      
      // Replace variable references with actual values
      let evaluableCondition = cleanCondition;
      for (const [key, value] of Object.entries(state)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluableCondition = evaluableCondition.replace(regex, JSON.stringify(value));
      }

      // Basic evaluation (this is simplified - use a proper parser in production)
      return Boolean(eval(evaluableCondition));
    } catch (error) {
      console.error("Condition evaluation error:", error);
      return false;
    }
  }

  private applyTransform(transform: string, state: Record<string, any>): any {
    // Simple transformation - in production, use a proper transformation engine
    try {
      const func = new Function('state', `return ${transform}`);
      return func(state);
    } catch (error) {
      console.error("Transform application error:", error);
      return state;
    }
  }

  private validateAppStructure(nodes: AppNode[], edges: AppEdge[]): void {
    if (nodes.length === 0) {
      throw new Error("App must have at least one node");
    }

    // Check for cycles (simplified check)
    const nodeIds = new Set(nodes.map(n => n.id));
    
    for (const edge of edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        throw new Error(`Invalid edge: ${edge.source} -> ${edge.target}`);
      }
    }

    // Ensure there's at least one input and one output node
    const hasInput = nodes.some(n => n.type === 'input');
    const hasOutput = nodes.some(n => n.type === 'output');
    
    if (!hasInput) {
      throw new Error("App must have at least one input node");
    }
    
    if (!hasOutput) {
      throw new Error("App must have at least one output node");
    }
  }

  async getAppExecutions(appId: number, limit: number = 50): Promise<any[]> {
    try {
      return await db.select()
        .from(appExecutions)
        .where(eq(appExecutions.appId, appId))
        .orderBy(desc(appExecutions.startedAt))
        .limit(limit);
    } catch (error) {
      console.error("Failed to get app executions:", error);
      return [];
    }
  }

  async getExecutionById(executionId: number): Promise<any | null> {
    try {
      const [execution] = await db.select()
        .from(appExecutions)
        .where(eq(appExecutions.id, executionId));
      
      return execution || null;
    } catch (error) {
      console.error("Failed to get execution:", error);
      return null;
    }
  }
}

export const agentAppBuilderService = new AgentAppBuilderService();