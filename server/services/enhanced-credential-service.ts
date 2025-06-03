import { db } from '../db';
import { eq } from 'drizzle-orm';
import { credentials } from '@shared/schema';
import crypto from 'crypto';
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

interface Credential {
  id: number;
  keyId: string;
  name: string;
  displayName: string;
  category: string;
  description?: string;
  provider: string;
  storageType: 'local' | 'aws_parameter_store' | 'environment';
  encryptedValue?: string;
  awsParameterName?: string;
  isRequired: boolean;
  isConfigured: boolean;
  isMasked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CredentialDefinition {
  keyId: string;
  name: string;
  displayName: string;
  category: string;
  description: string;
  provider: string;
  isRequired: boolean;
  defaultStorageType?: 'local' | 'aws_parameter_store' | 'environment';
}

export class EnhancedCredentialService {
  private encryptionKey: string;
  private ssmClient?: SSMClient;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    
    // Initialize AWS SSM client if credentials are available
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.ssmClient = new SSMClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }
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

  getRequiredCredentialDefinitions(): CredentialDefinition[] {
    return [
      {
        keyId: 'SERPAPI_API_KEY',
        name: 'SerpAPI Key',
        displayName: 'SerpAPI Search Key',
        category: 'MCP Connectors',
        description: 'API key for SerpAPI travel search functionality',
        provider: 'serpapi',
        isRequired: true,
        defaultStorageType: 'local'
      },
      {
        keyId: 'OPENAI_API_KEY',
        name: 'OpenAI Key',
        displayName: 'OpenAI API Key',
        category: 'AI Models',
        description: 'API key for OpenAI GPT models and services',
        provider: 'openai',
        isRequired: true,
        defaultStorageType: 'local'
      },
      {
        keyId: 'ANTHROPIC_API_KEY',
        name: 'Anthropic Key',
        displayName: 'Anthropic Claude API Key',
        category: 'AI Models',
        description: 'API key for Anthropic Claude models',
        provider: 'anthropic',
        isRequired: false,
        defaultStorageType: 'local'
      },
      {
        keyId: 'AWS_ACCESS_KEY_ID',
        name: 'AWS Access Key',
        displayName: 'AWS Access Key ID',
        category: 'Cloud Services',
        description: 'AWS access key for cloud services integration',
        provider: 'aws',
        isRequired: false,
        defaultStorageType: 'environment'
      },
      {
        keyId: 'AWS_SECRET_ACCESS_KEY',
        name: 'AWS Secret Key',
        displayName: 'AWS Secret Access Key',
        category: 'Cloud Services',
        description: 'AWS secret access key for cloud services',
        provider: 'aws',
        isRequired: false,
        defaultStorageType: 'environment'
      },
      {
        keyId: 'WEATHER_API_KEY',
        name: 'Weather API Key',
        displayName: 'Weather Service API Key',
        category: 'MCP Connectors',
        description: 'API key for weather data services',
        provider: 'weather',
        isRequired: false,
        defaultStorageType: 'local'
      }
    ];
  }

  async getAllCredentials(): Promise<Credential[]> {
    try {
      const result = await db.execute(`
        SELECT id, key_id, name, display_name, category, description, provider, 
               storage_type, encrypted_value, aws_parameter_name, is_required, 
               is_configured, is_masked, created_at, updated_at
        FROM credentials
        ORDER BY category, display_name
      `);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        keyId: row.key_id,
        name: row.name,
        displayName: row.display_name,
        category: row.category,
        description: row.description,
        provider: row.provider,
        storageType: row.storage_type,
        encryptedValue: row.is_masked && row.encrypted_value ? '••••••••' : row.encrypted_value,
        awsParameterName: row.aws_parameter_name,
        isRequired: row.is_required,
        isConfigured: row.is_configured,
        isMasked: row.is_masked,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Get credentials error:', error);
      throw new Error('Failed to retrieve credentials');
    }
  }

  async setCredential(keyId: string, value: string, storageType: 'local' | 'aws_parameter_store' | 'environment' = 'local'): Promise<void> {
    try {
      let encryptedValue: string | null = null;
      let awsParameterName: string | null = null;

      if (storageType === 'local') {
        encryptedValue = this.encrypt(value);
      } else if (storageType === 'aws_parameter_store') {
        if (!this.ssmClient) {
          throw new Error('AWS SSM client not configured. Please set AWS credentials.');
        }
        
        awsParameterName = `/agent-platform/credentials/${keyId}`;
        
        await this.ssmClient.send(new PutParameterCommand({
          Name: awsParameterName,
          Value: value,
          Type: 'SecureString',
          Overwrite: true,
        }));
      }

      await db.execute(`
        INSERT INTO credentials (key_id, name, display_name, category, description, provider, storage_type, encrypted_value, aws_parameter_name, is_required, is_configured, is_masked)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, true)
        ON CONFLICT (key_id) 
        DO UPDATE SET 
          storage_type = $7,
          encrypted_value = $8,
          aws_parameter_name = $9,
          is_configured = true,
          updated_at = NOW()
      `, [
        keyId,
        keyId.toLowerCase().replace(/_/g, ' '),
        keyId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        'Integration Services',
        `API key for ${keyId.toLowerCase()}`,
        keyId.toLowerCase().split('_')[0],
        storageType,
        encryptedValue,
        awsParameterName,
        false
      ]);

    } catch (error) {
      console.error('Set credential error:', error);
      throw new Error('Failed to set credential');
    }
  }

  async getCredentialValue(keyId: string): Promise<string | null> {
    try {
      const result = await db.execute(`
        SELECT storage_type, encrypted_value, aws_parameter_name 
        FROM credentials 
        WHERE key_id = $1 AND is_configured = true
      `, [keyId]);

      if (result.rows.length === 0) {
        return null;
      }

      const credential = result.rows[0] as any;

      if (credential.storage_type === 'local' && credential.encrypted_value) {
        return this.decrypt(credential.encrypted_value);
      } else if (credential.storage_type === 'aws_parameter_store' && credential.aws_parameter_name) {
        if (!this.ssmClient) {
          throw new Error('AWS SSM client not configured');
        }
        
        const response = await this.ssmClient.send(new GetParameterCommand({
          Name: credential.aws_parameter_name,
          WithDecryption: true,
        }));
        
        return response.Parameter?.Value || null;
      } else if (credential.storage_type === 'environment') {
        return process.env[keyId] || null;
      }

      return null;
    } catch (error) {
      console.error(`Get credential value error for ${keyId}:`, error);
      return null;
    }
  }

  async testAwsConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      if (!this.ssmClient) {
        return {
          connected: false,
          message: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
        };
      }

      // Test connection by trying to get a parameter (this will fail gracefully if parameter doesn't exist)
      await this.ssmClient.send(new GetParameterCommand({
        Name: '/test-connection'
      }));
      
      return {
        connected: true,
        message: 'AWS Parameter Store connection successful'
      };
    } catch (error: any) {
      if (error.name === 'ParameterNotFound') {
        return {
          connected: true,
          message: 'AWS Parameter Store connection successful'
        };
      }
      
      return {
        connected: false,
        message: `AWS connection failed: ${error.message}`
      };
    }
  }

  async initializeRequiredCredentials(): Promise<void> {
    try {
      const definitions = this.getRequiredCredentialDefinitions();
      
      for (const def of definitions) {
        const existing = await db.execute(`
          SELECT id FROM credentials WHERE key_id = $1
        `, [def.keyId]);

        if (existing.rows.length === 0) {
          await db.execute(`
            INSERT INTO credentials (key_id, name, display_name, category, description, provider, storage_type, is_required, is_configured, is_masked)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, true)
          `, [
            def.keyId,
            def.name,
            def.displayName,
            def.category,
            def.description,
            def.provider,
            def.defaultStorageType || 'local',
            def.isRequired
          ]);
        }
      }
      
      console.log('Required credentials initialized');
    } catch (error) {
      console.error('Failed to initialize required credentials:', error);
    }
  }

  async getCredentialSummary(): Promise<any> {
    try {
      const credentials = await this.getAllCredentials();
      
      const summary = {
        total: credentials.length,
        configured: credentials.filter(c => c.isConfigured).length,
        required: credentials.filter(c => c.isRequired).length,
        byCategory: {} as Record<string, { total: number; configured: number }>
      };

      const categories = [...new Set(credentials.map(c => c.category))];
      
      for (const category of categories) {
        const categoryCredentials = credentials.filter(c => c.category === category);
        summary.byCategory[category] = {
          total: categoryCredentials.length,
          configured: categoryCredentials.filter(c => c.isConfigured).length,
        };
      }

      return summary;
    } catch (error) {
      console.error('Get credential summary error:', error);
      throw new Error('Failed to get credential summary');
    }
  }

  async deleteCredential(keyId: string) {
    try {
      const [credential] = await db.select().from(credentials).where(eq(credentials.keyId, keyId));
      
      if (!credential) {
        throw new Error(`Credential ${keyId} not found`);
      }

      // Clear the value but keep the credential definition
      await db.update(credentials)
        .set({
          encryptedValue: null,
          isConfigured: false,
          updatedAt: new Date()
        })
        .where(eq(credentials.keyId, keyId));
    } catch (error) {
      console.error('Delete credential error:', error);
      throw new Error('Failed to delete credential');
    }
  }

  async getRequiredMissingCredentials() {
    try {
      const allCredentials = await this.getAllCredentials();
      return allCredentials.filter(cred => cred.isRequired && !cred.isConfigured);
    } catch (error) {
      console.error('Get missing credentials error:', error);
      throw new Error('Failed to get missing credentials');
    }
  }

  async createCustomCredential(credentialData: any) {
    try {
      const [newCredential] = await db
        .insert(credentials)
        .values({
          keyId: credentialData.keyId,
          name: credentialData.name,
          displayName: credentialData.displayName,
          category: credentialData.category || 'Custom',
          description: credentialData.description || '',
          provider: credentialData.provider || 'custom',
          storageType: credentialData.storageType || 'local',
          isRequired: credentialData.isRequired || false,
          isConfigured: false,
          isMasked: credentialData.isMasked !== false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newCredential.id;
    } catch (error) {
      console.error('Create custom credential error:', error);
      throw new Error('Failed to create custom credential');
    }
  }
}

export const enhancedCredentialService = new EnhancedCredentialService();