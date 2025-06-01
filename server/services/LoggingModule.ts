import { db } from "../db";
import { agentLogs } from "@shared/schema";
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from "@aws-sdk/client-cloudwatch-logs";

export class LoggingModule {
  private cloudWatchClient: CloudWatchLogsClient;
  private logGroupName: string;

  constructor() {
    this.cloudWatchClient = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || "us-east-1"
    });
    this.logGroupName = process.env.CLOUDWATCH_LOG_GROUP || "/agent-platform/execution-logs";
  }

  async logExecution(
    agentId: string,
    executionId: string,
    status: "success" | "error" | "running",
    metadata: any
  ): Promise<void> {
    const logEntry = {
      agentId,
      executionId,
      status,
      duration: metadata.duration || null,
      tokenCount: metadata.tokenCount || null,
      model: metadata.model || null,
      errorMessage: metadata.error || null,
      metadata: {
        fromCache: metadata.fromCache || false,
        input: metadata.input ? metadata.input.substring(0, 1000) : null, // Truncate for storage
        output: metadata.output ? metadata.output.substring(0, 2000) : null,
        ...metadata
      }
    };

    try {
      // Store in database
      await db.insert(agentLogs).values(logEntry);

      // Send to CloudWatch
      await this.sendToCloudWatch(logEntry);
    } catch (error) {
      console.error("Failed to log execution:", error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  async logAgentAction(
    agentId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    const executionId = crypto.randomUUID();
    
    await this.logExecution(agentId, executionId, "success", {
      action,
      ...metadata
    });
  }

  async getExecutionLogs(
    agentId?: string,
    limit: number = 100,
    status?: string
  ): Promise<any[]> {
    try {
      let query = db.select().from(agentLogs);

      if (agentId) {
        query = query.where(eq(agentLogs.agentId, agentId));
      }

      if (status) {
        query = query.where(eq(agentLogs.status, status));
      }

      const logs = await query
        .orderBy(desc(agentLogs.timestamp))
        .limit(limit);

      return logs;
    } catch (error) {
      console.error("Failed to fetch execution logs:", error);
      return [];
    }
  }

  async getExecutionStats(agentId?: string, days: number = 7): Promise<{
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    errorCount: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = db.select().from(agentLogs);
      
      if (agentId) {
        query = query.where(and(
          eq(agentLogs.agentId, agentId),
          gte(agentLogs.timestamp, cutoffDate)
        ));
      } else {
        query = query.where(gte(agentLogs.timestamp, cutoffDate));
      }

      const logs = await query;

      const totalExecutions = logs.length;
      const successCount = logs.filter(log => log.status === "success").length;
      const errorCount = logs.filter(log => log.status === "error").length;
      const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

      const durationsWithValues = logs
        .filter(log => log.duration !== null)
        .map(log => log.duration!);
      
      const averageDuration = durationsWithValues.length > 0
        ? durationsWithValues.reduce((sum, duration) => sum + duration, 0) / durationsWithValues.length
        : 0;

      return {
        totalExecutions,
        successRate,
        averageDuration,
        errorCount
      };
    } catch (error) {
      console.error("Failed to get execution stats:", error);
      return {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        errorCount: 0
      };
    }
  }

  private async sendToCloudWatch(logEntry: any): Promise<void> {
    try {
      const logStreamName = `agent-${logEntry.agentId}-${new Date().toISOString().split('T')[0]}`;
      
      // Create log stream if it doesn't exist (this will fail silently if it already exists)
      try {
        await this.cloudWatchClient.send(new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName
        }));
      } catch (error) {
        // Log stream might already exist, continue
      }

      // Send log event
      await this.cloudWatchClient.send(new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName,
        logEvents: [{
          timestamp: Date.now(),
          message: JSON.stringify({
            level: logEntry.status === "error" ? "ERROR" : "INFO",
            agentId: logEntry.agentId,
            executionId: logEntry.executionId,
            status: logEntry.status,
            duration: logEntry.duration,
            message: logEntry.errorMessage || "Agent execution completed",
            metadata: logEntry.metadata
          })
        }]
      }));
    } catch (error) {
      console.error("Failed to send logs to CloudWatch:", error);
      // Don't throw - CloudWatch failures shouldn't break the main flow
    }
  }
}
