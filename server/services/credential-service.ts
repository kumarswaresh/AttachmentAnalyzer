import crypto from 'crypto';
import { db } from '../db';
import { credentials, credentialTemplates, type Credential, type InsertCredential } from '@shared/credential-schema';
import { eq, and } from 'drizzle-orm';

// AWS SDK imports for Parameter Store
import { SSMClient, GetParameterCommand, PutParameterCommand, ParameterNotFound } from '@aws-sdk/client-ssm';

export class CredentialService {
  private encryptionKey: string;
  private ssmClient?: SSMClient;

  constructor() {
    // Use environment variable or generate a key (in production, use a secure key management system)
    this.encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    
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
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async initializeDefaultCredentials(): Promise<void> {
    console.log('Initializing default credential templates...');
    
    for (const template of credentialTemplates) {
      const existing = await db.select()
        .from(credentials)
        .where(eq(credentials.name, template.name))
        .limit(1);

      if (existing.length === 0) {
        const credentialId = crypto.randomUUID();
        
        await db.insert(credentials).values({
          id: credentialId,
          name: template.name,
          description: template.description,
          category: template.category,
          provider: template.provider,
          keyType: template.keyType,
          isRequired: template.isRequired,
          isConfigured: false,
          metadata: template.metadata,
        });
        
        console.log(`Created credential template: ${template.name}`);
      }
    }
  }

  async getAllCredentials(): Promise<Credential[]> {
    return await db.select().from(credentials);
  }

  async getCredentialsByCategory(category: string): Promise<Credential[]> {
    return await db.select()
      .from(credentials)
      .where(eq(credentials.category, category));
  }

  async getCredentialsByProvider(provider: string): Promise<Credential[]> {
    return await db.select()
      .from(credentials)
      .where(eq(credentials.provider, provider));
  }

  async setCredential(name: string, value: string, useAwsParameterStore = false, awsParameterPath?: string): Promise<void> {
    const existingCreds = await db.select()
      .from(credentials)
      .where(eq(credentials.name, name))
      .limit(1);

    if (existingCreds.length === 0) {
      throw new Error(`Credential ${name} not found. Please create it first.`);
    }

    const credential = existingCreds[0];
    let encryptedValue: string | null = null;
    let finalAwsParameterPath: string | null = null;

    if (useAwsParameterStore && this.ssmClient) {
      // Store in AWS Parameter Store
      finalAwsParameterPath = awsParameterPath || `/agent-platform/credentials/${name}`;
      
      try {
        await this.ssmClient.send(new PutParameterCommand({
          Name: finalAwsParameterPath,
          Value: value,
          Type: 'SecureString',
          Overwrite: true,
          Description: credential.description || `Credential for ${name}`,
        }));
        console.log(`Stored credential ${name} in AWS Parameter Store at ${finalAwsParameterPath}`);
      } catch (error) {
        console.error(`Failed to store credential in AWS Parameter Store:`, error);
        throw new Error(`Failed to store credential in AWS Parameter Store: ${error}`);
      }
    } else {
      // Store encrypted locally
      encryptedValue = this.encrypt(value);
    }

    // Update the credential record
    await db.update(credentials)
      .set({
        encryptedValue,
        awsParameterPath: finalAwsParameterPath,
        useAwsParameterStore,
        isConfigured: true,
        updatedAt: new Date(),
      })
      .where(eq(credentials.id, credential.id));

    console.log(`Updated credential ${name} (${useAwsParameterStore ? 'AWS Parameter Store' : 'Local Encrypted'})`);
  }

  async getCredentialValue(name: string): Promise<string | null> {
    const existingCreds = await db.select()
      .from(credentials)
      .where(and(
        eq(credentials.name, name),
        eq(credentials.isConfigured, true)
      ))
      .limit(1);

    if (existingCreds.length === 0) {
      // Check environment variables as fallback
      const envValue = process.env[name];
      if (envValue) {
        console.log(`Using environment variable for credential: ${name}`);
        return envValue;
      }
      return null;
    }

    const credential = existingCreds[0];

    if (credential.useAwsParameterStore && credential.awsParameterPath && this.ssmClient) {
      try {
        const result = await this.ssmClient.send(new GetParameterCommand({
          Name: credential.awsParameterPath,
          WithDecryption: true,
        }));
        return result.Parameter?.Value || null;
      } catch (error) {
        if (error instanceof ParameterNotFound) {
          console.warn(`Parameter ${credential.awsParameterPath} not found in AWS Parameter Store`);
        } else {
          console.error(`Error retrieving parameter from AWS Parameter Store:`, error);
        }
        return null;
      }
    } else if (credential.encryptedValue) {
      try {
        return this.decrypt(credential.encryptedValue);
      } catch (error) {
        console.error(`Error decrypting credential ${name}:`, error);
        return null;
      }
    }

    return null;
  }

  async deleteCredential(name: string): Promise<void> {
    const existingCreds = await db.select()
      .from(credentials)
      .where(eq(credentials.name, name))
      .limit(1);

    if (existingCreds.length === 0) {
      throw new Error(`Credential ${name} not found`);
    }

    const credential = existingCreds[0];

    // If stored in AWS Parameter Store, we don't delete it automatically for safety
    if (credential.useAwsParameterStore && credential.awsParameterPath) {
      console.log(`Note: AWS Parameter Store value at ${credential.awsParameterPath} was not automatically deleted`);
    }

    // Clear the credential but keep the template
    await db.update(credentials)
      .set({
        encryptedValue: null,
        awsParameterPath: null,
        useAwsParameterStore: false,
        isConfigured: false,
        updatedAt: new Date(),
      })
      .where(eq(credentials.id, credential.id));

    console.log(`Cleared credential ${name}`);
  }

  async createCustomCredential(credentialData: InsertCredential): Promise<string> {
    const credentialId = crypto.randomUUID();
    
    await db.insert(credentials).values({
      id: credentialId,
      ...credentialData,
      isConfigured: false,
    });

    console.log(`Created custom credential: ${credentialData.name}`);
    return credentialId;
  }

  async testAwsParameterStoreConnection(): Promise<boolean> {
    if (!this.ssmClient) {
      return false;
    }

    try {
      // Try to list parameters to test connection
      await this.ssmClient.send(new GetParameterCommand({
        Name: '/test-connection-parameter-that-does-not-exist',
      }));
      return true;
    } catch (error) {
      if (error instanceof ParameterNotFound) {
        // This is expected - parameter doesn't exist, but connection works
        return true;
      }
      console.error('AWS Parameter Store connection test failed:', error);
      return false;
    }
  }

  async getRequiredMissingCredentials(): Promise<Credential[]> {
    return await db.select()
      .from(credentials)
      .where(and(
        eq(credentials.isRequired, true),
        eq(credentials.isConfigured, false)
      ));
  }

  async getCredentialSummary(): Promise<{
    total: number;
    configured: number;
    required: number;
    missing: number;
    byCategory: Record<string, { total: number; configured: number }>;
  }> {
    const allCredentials = await this.getAllCredentials();
    
    const summary = {
      total: allCredentials.length,
      configured: allCredentials.filter(c => c.isConfigured).length,
      required: allCredentials.filter(c => c.isRequired).length,
      missing: allCredentials.filter(c => c.isRequired && !c.isConfigured).length,
      byCategory: {} as Record<string, { total: number; configured: number }>,
    };

    // Group by category
    const categories = [...new Set(allCredentials.map(c => c.category))];
    for (const category of categories) {
      const categoryCredentials = allCredentials.filter(c => c.category === category);
      summary.byCategory[category] = {
        total: categoryCredentials.length,
        configured: categoryCredentials.filter(c => c.isConfigured).length,
      };
    }

    return summary;
  }
}

export const credentialService = new CredentialService();