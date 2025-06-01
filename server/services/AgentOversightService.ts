import { EventEmitter } from 'events';
import { storage } from '../storage';
import type { Agent, AgentLog } from '@shared/schema';

export interface PerformanceMetrics {
  agentId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  costPerExecution: number;
  totalCost: number;
  lastExecuted: string;
  errorRate: number;
  reliability: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ExecutionTrend {
  date: string;
  executions: number;
  successRate: number;
  averageResponseTime: number;
  errors: number;
}

export interface AlertConfig {
  agentId: string;
  thresholds: {
    errorRatePercent: number;
    responseTimeMs: number;
    failureCount: number;
    costPerHour: number;
  };
  notifications: {
    email?: string;
    webhook?: string;
    slack?: string;
  };
  enabled: boolean;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  checker: (log: AgentLog) => boolean;
  action: 'warn' | 'pause' | 'terminate';
}

export interface SecurityEvent {
  id: string;
  agentId: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: 'unauthorized_access' | 'suspicious_activity' | 'data_leak' | 'compliance_violation';
  details: string;
  resolved: boolean;
}

export class AgentOversightService extends EventEmitter {
  private performanceCache: Map<string, PerformanceMetrics> = new Map();
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private complianceRules: ComplianceRule[] = [];
  private securityEvents: SecurityEvent[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeComplianceRules();
    this.startMonitoring();
  }

  // Performance Analytics
  async calculatePerformanceMetrics(agentId: string): Promise<PerformanceMetrics> {
    const logs = await storage.getAgentLogs(agentId, 1000);
    const agent = await storage.getAgent(agentId);
    
    if (!agent || logs.length === 0) {
      return this.getDefaultMetrics(agentId);
    }

    const totalExecutions = logs.length;
    const successfulExecutions = logs.filter(log => log.status === 'success').length;
    const failedExecutions = logs.filter(log => log.status === 'error').length;
    const successRate = (successfulExecutions / totalExecutions) * 100;

    // Calculate average response time
    const responseTimes = logs
      .filter(log => log.responseTime)
      .map(log => log.responseTime!);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Calculate token usage and costs
    const totalTokensUsed = logs.reduce((sum, log) => {
      const metadata = typeof log.metadata === 'object' ? log.metadata as any : {};
      return sum + (metadata.tokensUsed || 0);
    }, 0);

    const costPerToken = 0.00002; // Approximate cost per token
    const totalCost = totalTokensUsed * costPerToken;
    const costPerExecution = totalExecutions > 0 ? totalCost / totalExecutions : 0;

    const errorRate = (failedExecutions / totalExecutions) * 100;
    const lastExecuted = logs[0]?.createdAt || new Date().toISOString();

    // Determine reliability rating
    let reliability: PerformanceMetrics['reliability'] = 'poor';
    if (successRate >= 95 && averageResponseTime < 2000) reliability = 'excellent';
    else if (successRate >= 85 && averageResponseTime < 5000) reliability = 'good';
    else if (successRate >= 70 && averageResponseTime < 10000) reliability = 'fair';

    const metrics: PerformanceMetrics = {
      agentId,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      averageResponseTime,
      totalTokensUsed,
      costPerExecution,
      totalCost,
      lastExecuted,
      errorRate,
      reliability
    };

    this.performanceCache.set(agentId, metrics);
    return metrics;
  }

  async getExecutionTrends(agentId: string, days: number = 30): Promise<ExecutionTrend[]> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const logs = await storage.getAgentLogs(agentId);
    const trends: ExecutionTrend[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLogs = logs.filter(log => 
        log.createdAt.startsWith(dateStr)
      );

      const executions = dayLogs.length;
      const successful = dayLogs.filter(log => log.status === 'success').length;
      const successRate = executions > 0 ? (successful / executions) * 100 : 0;
      const errors = dayLogs.filter(log => log.status === 'error').length;

      const responseTimes = dayLogs
        .filter(log => log.responseTime)
        .map(log => log.responseTime!);
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      trends.push({
        date: dateStr,
        executions,
        successRate,
        averageResponseTime,
        errors
      });
    }

    return trends;
  }

  // Alert Management
  setAlertConfig(config: AlertConfig): void {
    this.alertConfigs.set(config.agentId, config);
    this.emit('alertConfigUpdated', config);
  }

  getAlertConfig(agentId: string): AlertConfig | undefined {
    return this.alertConfigs.get(agentId);
  }

  async checkAlerts(agentId: string): Promise<void> {
    const config = this.alertConfigs.get(agentId);
    if (!config || !config.enabled) return;

    const metrics = await this.calculatePerformanceMetrics(agentId);
    const alerts: string[] = [];

    if (metrics.errorRate > config.thresholds.errorRatePercent) {
      alerts.push(`Error rate ${metrics.errorRate.toFixed(1)}% exceeds threshold ${config.thresholds.errorRatePercent}%`);
    }

    if (metrics.averageResponseTime > config.thresholds.responseTimeMs) {
      alerts.push(`Response time ${metrics.averageResponseTime.toFixed(0)}ms exceeds threshold ${config.thresholds.responseTimeMs}ms`);
    }

    if (metrics.failedExecutions > config.thresholds.failureCount) {
      alerts.push(`Failure count ${metrics.failedExecutions} exceeds threshold ${config.thresholds.failureCount}`);
    }

    const hourlyCost = (metrics.totalCost / 24); // Approximate hourly cost
    if (hourlyCost > config.thresholds.costPerHour) {
      alerts.push(`Hourly cost $${hourlyCost.toFixed(2)} exceeds threshold $${config.thresholds.costPerHour}`);
    }

    if (alerts.length > 0) {
      this.emit('alertTriggered', {
        agentId,
        alerts,
        metrics,
        config
      });
    }
  }

  // Compliance & Security
  private initializeComplianceRules(): void {
    this.complianceRules = [
      {
        id: 'data_retention',
        name: 'Data Retention Policy',
        description: 'Ensure data is not retained beyond policy limits',
        severity: 'high',
        checker: (log) => {
          const metadata = typeof log.metadata === 'object' ? log.metadata as any : {};
          return metadata.dataRetained !== true;
        },
        action: 'warn'
      },
      {
        id: 'pii_exposure',
        name: 'PII Exposure Prevention',
        description: 'Detect potential PII in agent outputs',
        severity: 'critical',
        checker: (log) => {
          const response = log.response || '';
          const piiPatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b\d{16}\b/, // Credit card
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
          ];
          return !piiPatterns.some(pattern => pattern.test(response));
        },
        action: 'pause'
      },
      {
        id: 'excessive_tokens',
        name: 'Excessive Token Usage',
        description: 'Monitor for unusually high token consumption',
        severity: 'medium',
        checker: (log) => {
          const metadata = typeof log.metadata === 'object' ? log.metadata as any : {};
          return (metadata.tokensUsed || 0) < 10000;
        },
        action: 'warn'
      }
    ];
  }

  async checkCompliance(agentId: string): Promise<void> {
    const logs = await storage.getAgentLogs(agentId, 100);
    
    for (const log of logs) {
      for (const rule of this.complianceRules) {
        if (!rule.checker(log)) {
          const event: SecurityEvent = {
            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            timestamp: new Date().toISOString(),
            severity: rule.severity === 'critical' ? 'critical' : 
                     rule.severity === 'high' ? 'error' : 'warning',
            type: 'compliance_violation',
            details: `Rule violated: ${rule.name} - ${rule.description}`,
            resolved: false
          };

          this.securityEvents.push(event);
          this.emit('complianceViolation', { rule, log, event });

          if (rule.action === 'pause') {
            await this.pauseAgent(agentId, `Compliance violation: ${rule.name}`);
          }
        }
      }
    }
  }

  // Agent Control
  async pauseAgent(agentId: string, reason: string): Promise<void> {
    await storage.updateAgent(agentId, { status: 'paused' });
    
    await storage.createAgentLog({
      agentId,
      action: 'pause',
      status: 'info',
      message: `Agent paused: ${reason}`,
      metadata: { reason, pausedAt: new Date().toISOString() }
    });

    this.emit('agentPaused', { agentId, reason });
  }

  async resumeAgent(agentId: string): Promise<void> {
    await storage.updateAgent(agentId, { status: 'active' });
    
    await storage.createAgentLog({
      agentId,
      action: 'resume',
      status: 'info',
      message: 'Agent resumed',
      metadata: { resumedAt: new Date().toISOString() }
    });

    this.emit('agentResumed', { agentId });
  }

  // Monitoring
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const agents = await storage.getAgents();
        
        for (const agent of agents) {
          await this.checkAlerts(agent.id);
          await this.checkCompliance(agent.id);
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 60000); // Check every minute
  }

  private getDefaultMetrics(agentId: string): PerformanceMetrics {
    return {
      agentId,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      costPerExecution: 0,
      totalCost: 0,
      lastExecuted: new Date().toISOString(),
      errorRate: 0,
      reliability: 'poor'
    };
  }

  // Public API
  async getAllMetrics(): Promise<PerformanceMetrics[]> {
    const agents = await storage.getAgents();
    const metrics: PerformanceMetrics[] = [];

    for (const agent of agents) {
      const agentMetrics = await this.calculatePerformanceMetrics(agent.id);
      metrics.push(agentMetrics);
    }

    return metrics;
  }

  getSecurityEvents(agentId?: string): SecurityEvent[] {
    if (agentId) {
      return this.securityEvents.filter(event => event.agentId === agentId);
    }
    return this.securityEvents;
  }

  resolveSecurityEvent(eventId: string): void {
    const event = this.securityEvents.find(e => e.id === eventId);
    if (event) {
      event.resolved = true;
      this.emit('securityEventResolved', event);
    }
  }

  async getSystemOverview(): Promise<{
    totalAgents: number;
    activeAgents: number;
    pausedAgents: number;
    totalExecutions: number;
    overallSuccessRate: number;
    totalCost: number;
    securityAlerts: number;
    complianceIssues: number;
  }> {
    const agents = await storage.getAgents();
    const allMetrics = await this.getAllMetrics();

    const totalExecutions = allMetrics.reduce((sum, m) => sum + m.totalExecutions, 0);
    const totalSuccessful = allMetrics.reduce((sum, m) => sum + m.successfulExecutions, 0);
    const overallSuccessRate = totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0;
    const totalCost = allMetrics.reduce((sum, m) => sum + m.totalCost, 0);

    const securityAlerts = this.securityEvents.filter(e => !e.resolved && e.severity === 'critical').length;
    const complianceIssues = this.securityEvents.filter(e => !e.resolved && e.type === 'compliance_violation').length;

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      pausedAgents: agents.filter(a => a.status === 'paused').length,
      totalExecutions,
      overallSuccessRate,
      totalCost,
      securityAlerts,
      complianceIssues
    };
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.removeAllListeners();
  }
}

export const agentOversight = new AgentOversightService();