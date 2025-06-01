export interface WorkflowAutomationConfig {
  workflows: Record<string, WorkflowDefinition>;
  triggers: TriggerConfig[];
  actions: ActionConfig[];
  conditions: ConditionConfig[];
  maxExecutionTime: number;
  enableScheduling: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  steps: WorkflowStep[];
  errorHandling: ErrorHandlingConfig;
  metadata: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  type: "action" | "condition" | "loop" | "parallel" | "delay";
  config: any;
  nextSteps: string[];
  errorHandling?: ErrorHandlingConfig;
}

export interface TriggerConfig {
  id: string;
  type: "webhook" | "schedule" | "event" | "file" | "api";
  config: Record<string, any>;
  enabled: boolean;
}

export interface ActionConfig {
  id: string;
  type: "api_call" | "email" | "slack" | "database" | "file_operation" | "transform";
  config: Record<string, any>;
}

export interface ConditionConfig {
  id: string;
  type: "comparison" | "exists" | "regex" | "custom";
  config: Record<string, any>;
}

export interface ErrorHandlingConfig {
  strategy: "stop" | "continue" | "retry" | "fallback";
  maxRetries?: number;
  fallbackStep?: string;
}

export interface WorkflowExecutionRequest {
  workflowId: string;
  input: any;
  context?: Record<string, any>;
  priority?: "low" | "normal" | "high";
}

export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startTime: Date;
  endTime?: Date;
  steps: StepExecutionResult[];
  output?: any;
  error?: string;
}

export interface StepExecutionResult {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startTime: Date;
  endTime?: Date;
  input?: any;
  output?: any;
  error?: string;
  retries: number;
}

export class WorkflowAutomationModule {
  private config: WorkflowAutomationConfig;
  private executions: Map<string, WorkflowExecutionResult> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: WorkflowAutomationConfig) {
    this.config = config;
    this.setupScheduledTriggers();
  }

  async invoke(input: WorkflowExecutionRequest): Promise<{
    success: boolean;
    executionId?: string;
    error?: string;
    status: string;
  }> {
    try {
      const workflow = this.config.workflows[input.workflowId];
      if (!workflow) {
        throw new Error(`Workflow '${input.workflowId}' not found`);
      }

      const executionId = this.generateExecutionId();
      const execution: WorkflowExecutionResult = {
        executionId,
        workflowId: input.workflowId,
        status: "running",
        startTime: new Date(),
        steps: [],
      };

      this.executions.set(executionId, execution);

      // Execute workflow asynchronously
      this.executeWorkflow(execution, workflow, input.input, input.context)
        .catch(error => {
          execution.status = "failed";
          execution.error = error.message;
          execution.endTime = new Date();
        });

      return {
        success: true,
        executionId,
        status: "running",
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        status: "failed",
      };
    }
  }

  private async executeWorkflow(
    execution: WorkflowExecutionResult,
    workflow: WorkflowDefinition,
    input: any,
    context: Record<string, any> = {}
  ): Promise<void> {
    try {
      let currentData = input;
      const executionContext = { ...context, workflowId: workflow.id };

      // Find entry point (first step)
      const entrySteps = workflow.steps.filter(step => 
        !workflow.steps.some(s => s.nextSteps.includes(step.id))
      );

      if (entrySteps.length === 0) {
        throw new Error("No entry point found in workflow");
      }

      // Execute steps starting from entry points
      for (const entryStep of entrySteps) {
        await this.executeStep(
          execution,
          workflow,
          entryStep,
          currentData,
          executionContext
        );
      }

      execution.status = "completed";
      execution.endTime = new Date();
      execution.output = currentData;

    } catch (error) {
      execution.status = "failed";
      execution.error = (error as Error).message;
      execution.endTime = new Date();
    }
  }

  private async executeStep(
    execution: WorkflowExecutionResult,
    workflow: WorkflowDefinition,
    step: WorkflowStep,
    data: any,
    context: Record<string, any>
  ): Promise<any> {
    const stepResult: StepExecutionResult = {
      stepId: step.id,
      status: "running",
      startTime: new Date(),
      input: data,
      retries: 0,
    };

    execution.steps.push(stepResult);

    try {
      let result = data;

      switch (step.type) {
        case "action":
          result = await this.executeAction(step, data, context);
          break;
        case "condition":
          const conditionResult = await this.evaluateCondition(step, data, context);
          if (!conditionResult) {
            stepResult.status = "skipped";
            return data;
          }
          result = data;
          break;
        case "loop":
          result = await this.executeLoop(execution, workflow, step, data, context);
          break;
        case "parallel":
          result = await this.executeParallel(execution, workflow, step, data, context);
          break;
        case "delay":
          await this.executeDelay(step);
          result = data;
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      stepResult.status = "completed";
      stepResult.endTime = new Date();
      stepResult.output = result;

      // Execute next steps
      if (step.nextSteps.length > 0) {
        for (const nextStepId of step.nextSteps) {
          const nextStep = workflow.steps.find(s => s.id === nextStepId);
          if (nextStep) {
            await this.executeStep(execution, workflow, nextStep, result, context);
          }
        }
      }

      return result;

    } catch (error) {
      stepResult.status = "failed";
      stepResult.error = (error as Error).message;
      stepResult.endTime = new Date();

      // Handle error based on error handling strategy
      const errorHandling = step.errorHandling || workflow.errorHandling;
      return this.handleStepError(execution, workflow, step, error as Error, data, context, errorHandling);
    }
  }

  private async executeAction(step: WorkflowStep, data: any, context: Record<string, any>): Promise<any> {
    const actionConfig = this.config.actions.find(a => a.id === step.config.actionId);
    if (!actionConfig) {
      throw new Error(`Action '${step.config.actionId}' not found`);
    }

    switch (actionConfig.type) {
      case "api_call":
        return this.executeApiCall(actionConfig.config, step.config, data, context);
      case "email":
        return this.sendEmail(actionConfig.config, step.config, data, context);
      case "slack":
        return this.sendSlackMessage(actionConfig.config, step.config, data, context);
      case "database":
        return this.executeDatabaseOperation(actionConfig.config, step.config, data, context);
      case "file_operation":
        return this.executeFileOperation(actionConfig.config, step.config, data, context);
      case "transform":
        return this.executeTransformation(actionConfig.config, step.config, data, context);
      default:
        throw new Error(`Unknown action type: ${actionConfig.type}`);
    }
  }

  private async evaluateCondition(step: WorkflowStep, data: any, context: Record<string, any>): Promise<boolean> {
    const conditionConfig = this.config.conditions.find(c => c.id === step.config.conditionId);
    if (!conditionConfig) {
      throw new Error(`Condition '${step.config.conditionId}' not found`);
    }

    switch (conditionConfig.type) {
      case "comparison":
        return this.evaluateComparison(conditionConfig.config, step.config, data, context);
      case "exists":
        return this.evaluateExists(conditionConfig.config, step.config, data, context);
      case "regex":
        return this.evaluateRegex(conditionConfig.config, step.config, data, context);
      case "custom":
        return this.evaluateCustomCondition(conditionConfig.config, step.config, data, context);
      default:
        return true;
    }
  }

  private async executeLoop(
    execution: WorkflowExecutionResult,
    workflow: WorkflowDefinition,
    step: WorkflowStep,
    data: any,
    context: Record<string, any>
  ): Promise<any> {
    const { iterateOver, loopSteps, maxIterations = 100 } = step.config;
    const items = this.getFieldValue(data, iterateOver) || [];
    
    if (!Array.isArray(items)) {
      throw new Error("Loop iteration target must be an array");
    }

    const results = [];
    let iterations = 0;

    for (const item of items) {
      if (iterations >= maxIterations) {
        break;
      }

      const loopContext = { ...context, loopItem: item, loopIndex: iterations };
      let loopResult = item;

      for (const loopStepId of loopSteps) {
        const loopStep = workflow.steps.find(s => s.id === loopStepId);
        if (loopStep) {
          loopResult = await this.executeStep(execution, workflow, loopStep, loopResult, loopContext);
        }
      }

      results.push(loopResult);
      iterations++;
    }

    return { ...data, loopResults: results };
  }

  private async executeParallel(
    execution: WorkflowExecutionResult,
    workflow: WorkflowDefinition,
    step: WorkflowStep,
    data: any,
    context: Record<string, any>
  ): Promise<any> {
    const { parallelSteps } = step.config;
    const promises = [];

    for (const parallelStepId of parallelSteps) {
      const parallelStep = workflow.steps.find(s => s.id === parallelStepId);
      if (parallelStep) {
        promises.push(
          this.executeStep(execution, workflow, parallelStep, data, context)
        );
      }
    }

    const results = await Promise.all(promises);
    return { ...data, parallelResults: results };
  }

  private async executeDelay(step: WorkflowStep): Promise<void> {
    const { duration = 1000 } = step.config;
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  private async handleStepError(
    execution: WorkflowExecutionResult,
    workflow: WorkflowDefinition,
    step: WorkflowStep,
    error: Error,
    data: any,
    context: Record<string, any>,
    errorHandling: ErrorHandlingConfig
  ): Promise<any> {
    switch (errorHandling.strategy) {
      case "stop":
        throw error;
      case "continue":
        return data;
      case "retry":
        const stepResult = execution.steps.find(s => s.stepId === step.id);
        if (stepResult && stepResult.retries < (errorHandling.maxRetries || 3)) {
          stepResult.retries++;
          await this.delay(this.config.retryPolicy.initialDelay * Math.pow(this.config.retryPolicy.backoffMultiplier, stepResult.retries));
          return this.executeStep(execution, workflow, step, data, context);
        }
        throw error;
      case "fallback":
        if (errorHandling.fallbackStep) {
          const fallbackStep = workflow.steps.find(s => s.id === errorHandling.fallbackStep);
          if (fallbackStep) {
            return this.executeStep(execution, workflow, fallbackStep, data, context);
          }
        }
        return data;
      default:
        throw error;
    }
  }

  // Action implementations
  private async executeApiCall(actionConfig: any, stepConfig: any, data: any, context: Record<string, any>): Promise<any> {
    const { url, method = "GET", headers = {}, body } = stepConfig;
    const requestBody = body ? this.interpolateTemplate(JSON.stringify(body), data, context) : undefined;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: requestBody,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async sendEmail(actionConfig: any, stepConfig: any, data: any, context: Record<string, any>): Promise<any> {
    const { to, subject, body } = stepConfig;
    
    // Placeholder for email sending
    console.log(`Email sent to ${to}: ${subject}`);
    return { sent: true, to, subject };
  }

  private async sendSlackMessage(actionConfig: any, stepConfig: any, data: any, context: Record<string, any>): Promise<any> {
    const { channel, message } = stepConfig;
    
    // Placeholder for Slack message sending
    console.log(`Slack message sent to ${channel}: ${message}`);
    return { sent: true, channel, message };
  }

  private async executeDatabaseOperation(actionConfig: any, stepConfig: any, data: any, context: Record<string, any>): Promise<any> {
    const { operation, table, conditions, values } = stepConfig;
    
    // Placeholder for database operations
    console.log(`Database ${operation} on ${table}`);
    return { success: true, operation, table };
  }

  private async executeFileOperation(actionConfig: any, stepConfig: any, data: any, context: Record<string, any>): Promise<any> {
    const { operation, path, content } = stepConfig;
    
    // Placeholder for file operations
    console.log(`File ${operation} on ${path}`);
    return { success: true, operation, path };
  }

  private async executeTransformation(actionConfig: any, stepConfig: any, data: any, context: Record<string, any>): Promise<any> {
    const { transformation } = stepConfig;
    
    // Apply simple transformation
    switch (transformation) {
      case "uppercase":
        return typeof data === "string" ? data.toUpperCase() : data;
      case "lowercase":
        return typeof data === "string" ? data.toLowerCase() : data;
      default:
        return data;
    }
  }

  // Condition evaluations
  private evaluateComparison(conditionConfig: any, stepConfig: any, data: any, context: Record<string, any>): boolean {
    const { field, operator, value } = stepConfig;
    const fieldValue = this.getFieldValue(data, field);
    
    switch (operator) {
      case "eq": return fieldValue === value;
      case "ne": return fieldValue !== value;
      case "gt": return fieldValue > value;
      case "gte": return fieldValue >= value;
      case "lt": return fieldValue < value;
      case "lte": return fieldValue <= value;
      default: return false;
    }
  }

  private evaluateExists(conditionConfig: any, stepConfig: any, data: any, context: Record<string, any>): boolean {
    const { field } = stepConfig;
    const fieldValue = this.getFieldValue(data, field);
    return fieldValue !== undefined && fieldValue !== null;
  }

  private evaluateRegex(conditionConfig: any, stepConfig: any, data: any, context: Record<string, any>): boolean {
    const { field, pattern } = stepConfig;
    const fieldValue = this.getFieldValue(data, field);
    const regex = new RegExp(pattern);
    return regex.test(String(fieldValue));
  }

  private evaluateCustomCondition(conditionConfig: any, stepConfig: any, data: any, context: Record<string, any>): boolean {
    const { expression } = stepConfig;
    
    try {
      return new Function('data', 'context', `return ${expression}`)(data, context);
    } catch {
      return false;
    }
  }

  // Utility methods
  private setupScheduledTriggers(): void {
    if (!this.config.enableScheduling) return;

    const scheduledTriggers = this.config.triggers.filter(t => t.type === "schedule" && t.enabled);
    
    for (const trigger of scheduledTriggers) {
      const { cron, workflowId } = trigger.config;
      if (cron && workflowId) {
        // Simplified scheduling - in production use a proper cron library
        const interval = this.parseCronInterval(cron);
        if (interval > 0) {
          const job = setInterval(() => {
            this.invoke({ workflowId, input: {} });
          }, interval);
          
          this.scheduledJobs.set(trigger.id, job);
        }
      }
    }
  }

  private parseCronInterval(cron: string): number {
    // Very basic cron parsing - in production use a proper cron parser
    if (cron.includes("* * * * *")) return 60000; // Every minute
    if (cron.includes("0 * * * *")) return 3600000; // Every hour
    if (cron.includes("0 0 * * *")) return 86400000; // Every day
    return 0;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFieldValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private interpolateTemplate(template: string, data: any, context: Record<string, any>): string {
    let result = template;
    
    // Replace data placeholders
    result = result.replace(/\{\{data\.([^}]+)\}\}/g, (match, path) => {
      return String(this.getFieldValue(data, path) || '');
    });
    
    // Replace context placeholders
    result = result.replace(/\{\{context\.([^}]+)\}\}/g, (match, path) => {
      return String(this.getFieldValue(context, path) || '');
    });
    
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getExecution(executionId: string): WorkflowExecutionResult | undefined {
    return this.executions.get(executionId);
  }

  public getActiveExecutions(): WorkflowExecutionResult[] {
    return Array.from(this.executions.values()).filter(e => e.status === "running");
  }

  public cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === "running") {
      execution.status = "cancelled";
      execution.endTime = new Date();
      return true;
    }
    return false;
  }

  getSchema(): any {
    return {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "Workflow to execute",
          enum: Object.keys(this.config.workflows),
        },
        input: {
          description: "Input data for the workflow",
        },
        context: {
          type: "object",
          description: "Additional context data",
          additionalProperties: true,
        },
        priority: {
          type: "string",
          description: "Execution priority",
          enum: ["low", "normal", "high"],
          default: "normal",
        },
      },
      required: ["workflowId"],
    };
  }
}