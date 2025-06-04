import { multiCredentialService } from './multi-credential-service';
import { storage } from '../storage';
import type { Agent, AgentApp } from '@shared/schema';
import type { Credential } from '@shared/credential-schema';

export interface DeploymentConfig {
  agentId?: string;
  agentAppId?: string;
  deploymentType: 'standalone' | 'embedded' | 'api_only';
  environment: 'development' | 'staging' | 'production';
  accessKey: string;
  allowedOrigins?: string[];
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

export interface DeploymentManifest {
  id: string;
  name: string;
  type: 'agent' | 'agent_app';
  version: string;
  credentials: {
    provider: string;
    keyType: string;
    required: boolean;
  }[];
  endpoints: {
    execute: string;
    status: string;
    logs: string;
  };
  configuration: any;
  createdAt: Date;
  accessKey: string;
}

export class DeploymentService {
  
  /**
   * Deploy an agent as an independent service
   */
  async deployAgent(agentId: string, config: Partial<DeploymentConfig>): Promise<DeploymentManifest> {
    const agent = await storage.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Generate unique access key for this deployment
    const accessKey = this.generateAccessKey();
    
    // Get agent's credential requirements
    const credentialRequirements = await this.extractCredentialRequirements(agent);
    
    // Create deployment manifest
    const manifest: DeploymentManifest = {
      id: `deploy_${agentId}_${Date.now()}`,
      name: agent.name,
      type: 'agent',
      version: '1.0.0',
      credentials: credentialRequirements,
      endpoints: {
        execute: `/api/deployed/agents/${agentId}/execute`,
        status: `/api/deployed/agents/${agentId}/status`,
        logs: `/api/deployed/agents/${agentId}/logs`
      },
      configuration: {
        agentId,
        deploymentType: config.deploymentType || 'standalone',
        environment: config.environment || 'production',
        allowedOrigins: config.allowedOrigins || ['*'],
        rateLimit: config.rateLimit || { requests: 100, windowMs: 60000 }
      },
      createdAt: new Date(),
      accessKey
    };

    // Store deployment configuration
    await this.storeDeploymentConfig(manifest);
    
    console.log(`✓ Agent ${agent.name} deployed with access key: ${accessKey}`);
    
    return manifest;
  }

  /**
   * Deploy an agent app as an independent service
   */
  async deployAgentApp(agentAppId: string, config: Partial<DeploymentConfig>): Promise<DeploymentManifest> {
    const agentApp = await storage.getAgentApp(agentAppId);
    if (!agentApp) {
      throw new Error(`Agent App ${agentAppId} not found`);
    }

    const accessKey = this.generateAccessKey();
    
    // Get credential requirements from all agents in the app
    const credentialRequirements = await this.extractAppCredentialRequirements(agentApp);
    
    const manifest: DeploymentManifest = {
      id: `deploy_app_${agentAppId}_${Date.now()}`,
      name: agentApp.name,
      type: 'agent_app',
      version: '1.0.0',
      credentials: credentialRequirements,
      endpoints: {
        execute: `/api/deployed/agent-apps/${agentAppId}/execute`,
        status: `/api/deployed/agent-apps/${agentAppId}/status`,
        logs: `/api/deployed/agent-apps/${agentAppId}/logs`
      },
      configuration: {
        agentAppId,
        deploymentType: config.deploymentType || 'standalone',
        environment: config.environment || 'production',
        allowedOrigins: config.allowedOrigins || ['*'],
        rateLimit: config.rateLimit || { requests: 100, windowMs: 60000 }
      },
      createdAt: new Date(),
      accessKey
    };

    await this.storeDeploymentConfig(manifest);
    
    console.log(`✓ Agent App ${agentApp.name} deployed with access key: ${accessKey}`);
    
    return manifest;
  }

  /**
   * Get credentials for a deployed agent/app using access key
   */
  async getCredentialsForDeployment(accessKey: string, provider?: string): Promise<Credential[]> {
    const deployment = await this.getDeploymentByAccessKey(accessKey);
    if (!deployment) {
      throw new Error('Invalid access key');
    }

    let credentialIds: number[] = [];

    if (deployment.type === 'agent' && deployment.configuration.agentId) {
      // Get credentials assigned to the specific agent
      const agentCredentials = await multiCredentialService.getCredentialsForAgent(
        deployment.configuration.agentId
      );
      credentialIds = agentCredentials.map(ac => ac.credentialId);
    } else if (deployment.type === 'agent_app' && deployment.configuration.agentAppId) {
      // Get credentials for all agents in the app
      const agentApp = await storage.getAgentApp(deployment.configuration.agentAppId);
      if (agentApp?.workflow?.nodes) {
        for (const node of agentApp.workflow.nodes) {
          if (node.type === 'agent' && node.data.agentId) {
            const agentCredentials = await multiCredentialService.getCredentialsForAgent(
              node.data.agentId
            );
            credentialIds.push(...agentCredentials.map(ac => ac.credentialId));
          }
        }
      }
    }

    // Remove duplicates and get credentials
    const uniqueCredentialIds = [...new Set(credentialIds)];
    const credentials: Credential[] = [];

    for (const credId of uniqueCredentialIds) {
      const credential = await multiCredentialService.getCredential(credId);
      if (credential && (!provider || credential.provider === provider)) {
        credentials.push(credential);
      }
    }

    return credentials;
  }

  /**
   * Validate deployment access key and get configuration
   */
  async validateDeploymentAccess(accessKey: string): Promise<DeploymentManifest | null> {
    return await this.getDeploymentByAccessKey(accessKey);
  }

  /**
   * Execute deployed agent with credential resolution
   */
  async executeDeployedAgent(accessKey: string, input: any): Promise<any> {
    const deployment = await this.validateDeploymentAccess(accessKey);
    if (!deployment || deployment.type !== 'agent') {
      throw new Error('Invalid deployment or access key');
    }

    const agentId = deployment.configuration.agentId;
    const agent = await storage.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get credentials for this deployment
    const credentials = await this.getCredentialsForDeployment(accessKey);
    
    // Parse model configuration to get required provider
    let modelConfig;
    try {
      modelConfig = typeof agent.model === 'string' ? JSON.parse(agent.model) : agent.model;
    } catch {
      throw new Error('Invalid model configuration');
    }

    // Find appropriate credential for the model provider
    const credential = credentials.find(c => 
      c.provider === modelConfig.provider && c.isConfigured
    );

    if (!credential) {
      throw new Error(`No configured credential found for provider: ${modelConfig.provider}`);
    }

    // Execute agent with resolved credentials
    console.log(`Executing deployed agent ${agent.name} with credential ${credential.name}`);
    
    // Return execution result (would integrate with actual agent execution engine)
    return {
      success: true,
      agentId,
      deploymentId: deployment.id,
      credentialUsed: credential.name,
      input,
      output: `Agent ${agent.name} executed successfully with input: ${JSON.stringify(input)}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute deployed agent app with credential resolution
   */
  async executeDeployedAgentApp(accessKey: string, input: any): Promise<any> {
    const deployment = await this.validateDeploymentAccess(accessKey);
    if (!deployment || deployment.type !== 'agent_app') {
      throw new Error('Invalid deployment or access key');
    }

    const agentAppId = deployment.configuration.agentAppId;
    const agentApp = await storage.getAgentApp(agentAppId);
    if (!agentApp) {
      throw new Error('Agent App not found');
    }

    // Get all credentials for this deployment
    const credentials = await this.getCredentialsForDeployment(accessKey);
    
    console.log(`Executing deployed agent app ${agentApp.name} with ${credentials.length} available credentials`);
    
    // Return execution result (would integrate with actual workflow execution engine)
    return {
      success: true,
      agentAppId,
      deploymentId: deployment.id,
      credentialsAvailable: credentials.length,
      input,
      output: `Agent App ${agentApp.name} executed successfully`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * List all deployments
   */
  async getDeployments(): Promise<DeploymentManifest[]> {
    // This would fetch from a deployment storage (database table)
    // For now, return empty array as placeholder
    return [];
  }

  private generateAccessKey(): string {
    return `ak_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  }

  private async extractCredentialRequirements(agent: Agent): Promise<{ provider: string; keyType: string; required: boolean; }[]> {
    const requirements: { provider: string; keyType: string; required: boolean; }[] = [];
    
    // Parse model configuration
    try {
      const modelConfig = typeof agent.model === 'string' ? JSON.parse(agent.model) : agent.model;
      if (modelConfig.provider) {
        requirements.push({
          provider: modelConfig.provider,
          keyType: 'api_key',
          required: true
        });
      }
    } catch {
      // Invalid model configuration
    }

    // Check modules for additional credential requirements
    for (const module of agent.modules || []) {
      if (module.moduleId === 'web-search-module') {
        requirements.push({
          provider: 'search_api',
          keyType: 'api_key',
          required: false
        });
      }
      // Add more module-specific requirements as needed
    }

    return requirements;
  }

  private async extractAppCredentialRequirements(agentApp: AgentApp): Promise<{ provider: string; keyType: string; required: boolean; }[]> {
    const requirements: { provider: string; keyType: string; required: boolean; }[] = [];
    
    // Extract from workflow nodes
    if (agentApp.workflow?.nodes) {
      for (const node of agentApp.workflow.nodes) {
        if (node.type === 'agent' && node.data.agentId) {
          const agent = await storage.getAgent(node.data.agentId);
          if (agent) {
            const agentRequirements = await this.extractCredentialRequirements(agent);
            requirements.push(...agentRequirements);
          }
        }
      }
    }

    // Remove duplicates
    return requirements.filter((req, index, self) => 
      index === self.findIndex(r => r.provider === req.provider && r.keyType === req.keyType)
    );
  }

  private async storeDeploymentConfig(manifest: DeploymentManifest): Promise<void> {
    // Store deployment configuration in database
    // This would typically be stored in a deployments table
    console.log(`Storing deployment config for ${manifest.id}`);
  }

  private async getDeploymentByAccessKey(accessKey: string): Promise<DeploymentManifest | null> {
    // Retrieve deployment by access key from database
    // For demo purposes, return null (would implement actual storage)
    return null;
  }
}

export const deploymentService = new DeploymentService();