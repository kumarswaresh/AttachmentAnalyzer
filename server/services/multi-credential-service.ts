import { db } from '../db';
import { credentials, agentCredentials, agents } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

export interface CredentialInstance {
  id: number;
  name: string;
  provider: string;
  keyType: string;
  category: string;
  description?: string;
  isConfigured: boolean;
  isDefault: boolean;
  tags: string[];
  storageType: string;
  awsParameterName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialRequest {
  name: string;
  provider: string;
  keyType: string;
  category: string;
  description?: string;
  value: string;
  storageType?: 'internal' | 'aws_parameter_store';
  awsParameterName?: string;
  isDefault?: boolean;
  tags?: string[];
}

export interface AgentCredentialAssignment {
  agentId: string;
  credentialId: number;
  purpose: string;
}

export class MultiCredentialService {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  private encrypt(text: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decrypt(encryptedText: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async createCredential(request: CreateCredentialRequest): Promise<CredentialInstance> {
    const encryptedValue = this.encrypt(request.value);
    
    // If this is marked as default, unset other defaults for the same provider
    if (request.isDefault) {
      await db
        .update(credentials)
        .set({ isDefault: false })
        .where(eq(credentials.provider, request.provider));
    }

    const [credential] = await db
      .insert(credentials)
      .values({
        name: request.name,
        provider: request.provider,
        keyType: request.keyType,
        category: request.category,
        description: request.description,
        encryptedValue,
        storageType: request.storageType || 'internal',
        awsParameterName: request.awsParameterName,
        isConfigured: true,
        isDefault: request.isDefault || false,
        tags: request.tags || [],
      })
      .returning();

    return this.mapToCredentialInstance(credential);
  }

  async getCredentialsByProvider(provider: string): Promise<CredentialInstance[]> {
    const results = await db
      .select()
      .from(credentials)
      .where(eq(credentials.provider, provider))
      .orderBy(desc(credentials.isDefault), desc(credentials.createdAt));

    return results.map(this.mapToCredentialInstance);
  }

  async getAllCredentials(): Promise<CredentialInstance[]> {
    const results = await db
      .select()
      .from(credentials)
      .orderBy(credentials.provider, desc(credentials.isDefault));

    return results.map(this.mapToCredentialInstance);
  }

  async getCredentialsByCategory(category: string): Promise<CredentialInstance[]> {
    const results = await db
      .select()
      .from(credentials)
      .where(eq(credentials.category, category))
      .orderBy(credentials.provider, desc(credentials.isDefault));

    return results.map(this.mapToCredentialInstance);
  }

  async getCredentialValue(credentialId: number): Promise<string | null> {
    const [credential] = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, credentialId));

    if (!credential?.encryptedValue) {
      return null;
    }

    return this.decrypt(credential.encryptedValue);
  }

  async updateCredential(credentialId: number, updates: Partial<CreateCredentialRequest>): Promise<CredentialInstance> {
    const updateData: any = { ...updates };
    
    if (updates.value) {
      updateData.encryptedValue = this.encrypt(updates.value);
      updateData.isConfigured = true;
      delete updateData.value;
    }

    if (updates.isDefault) {
      // Unset other defaults for the same provider
      const [existingCredential] = await db
        .select()
        .from(credentials)
        .where(eq(credentials.id, credentialId));
      
      if (existingCredential) {
        await db
          .update(credentials)
          .set({ isDefault: false })
          .where(and(
            eq(credentials.provider, existingCredential.provider),
            eq(credentials.id, credentialId)
          ));
      }
    }

    const [updated] = await db
      .update(credentials)
      .set(updateData)
      .where(eq(credentials.id, credentialId))
      .returning();

    return this.mapToCredentialInstance(updated);
  }

  async deleteCredential(credentialId: number): Promise<void> {
    // Remove agent assignments first
    await db
      .delete(agentCredentials)
      .where(eq(agentCredentials.credentialId, credentialId));

    // Delete the credential
    await db
      .delete(credentials)
      .where(eq(credentials.id, credentialId));
  }

  async assignCredentialToAgent(assignment: AgentCredentialAssignment): Promise<void> {
    await db
      .insert(agentCredentials)
      .values(assignment);
  }

  async getAgentCredentials(agentId: string): Promise<CredentialInstance[]> {
    const results = await db
      .select({
        credential: credentials,
      })
      .from(agentCredentials)
      .innerJoin(credentials, eq(agentCredentials.credentialId, credentials.id))
      .where(eq(agentCredentials.agentId, agentId));

    return results.map(r => this.mapToCredentialInstance(r.credential));
  }

  async removeCredentialFromAgent(agentId: string, credentialId: number): Promise<void> {
    await db
      .delete(agentCredentials)
      .where(and(
        eq(agentCredentials.agentId, agentId),
        eq(agentCredentials.credentialId, credentialId)
      ));
  }

  async getDefaultCredentialForProvider(provider: string): Promise<CredentialInstance | null> {
    const [credential] = await db
      .select()
      .from(credentials)
      .where(and(
        eq(credentials.provider, provider),
        eq(credentials.isDefault, true)
      ));

    return credential ? this.mapToCredentialInstance(credential) : null;
  }

  async getProvidersWithCredentials(): Promise<string[]> {
    const results = await db
      .selectDistinct({ provider: credentials.provider })
      .from(credentials)
      .where(eq(credentials.isConfigured, true));

    return results.map(r => r.provider);
  }

  async getCredentialStats() {
    const total = await db.$count(credentials);
    const configured = await db.$count(credentials, eq(credentials.isConfigured, true));
    const providers = await this.getProvidersWithCredentials();
    
    return {
      total,
      configured,
      unconfigured: total - configured,
      providers: providers.length,
      providerList: providers
    };
  }

  private mapToCredentialInstance(credential: any): CredentialInstance {
    return {
      id: credential.id,
      name: credential.name,
      provider: credential.provider,
      keyType: credential.keyType,
      category: credential.category,
      description: credential.description,
      isConfigured: credential.isConfigured,
      isDefault: credential.isDefault,
      tags: credential.tags || [],
      storageType: credential.storageType,
      awsParameterName: credential.awsParameterName,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  // Initialize default credentials for common providers
  async initializeDefaultCredentials(): Promise<void> {
    const defaultCredentials = [
      {
        name: 'OpenAI Primary',
        provider: 'openai',
        keyType: 'api_key',
        category: 'AI Models',
        description: 'Primary OpenAI API key for GPT models',
        isDefault: true,
        isConfigured: false,
      },
      {
        name: 'Anthropic Primary',
        provider: 'anthropic',
        keyType: 'api_key',
        category: 'AI Models',
        description: 'Primary Anthropic API key for Claude models',
        isDefault: true,
        isConfigured: false,
      },
      {
        name: 'AWS Primary',
        provider: 'aws',
        keyType: 'access_key',
        category: 'Cloud Services',
        description: 'Primary AWS access credentials',
        isDefault: true,
        isConfigured: false,
      },
      {
        name: 'SerpAPI Primary',
        provider: 'serpapi',
        keyType: 'api_key',
        category: 'MCP Connectors',
        description: 'Primary SerpAPI key for search functionality',
        isDefault: true,
        isConfigured: false,
      },
      {
        name: 'Google Maps Primary',
        provider: 'google_maps',
        keyType: 'api_key',
        category: 'MCP Connectors',
        description: 'Primary Google Maps API key',
        isDefault: true,
        isConfigured: false,
      },
      {
        name: 'WeatherAPI Primary',
        provider: 'weatherapi',
        keyType: 'api_key',
        category: 'MCP Connectors',
        description: 'Primary WeatherAPI key',
        isDefault: true,
        isConfigured: false,
      },
    ];

    for (const cred of defaultCredentials) {
      const existing = await db
        .select()
        .from(credentials)
        .where(and(
          eq(credentials.provider, cred.provider),
          eq(credentials.name, cred.name)
        ));

      if (existing.length === 0) {
        await db.insert(credentials).values(cred);
      }
    }
  }
}

export const multiCredentialService = new MultiCredentialService();