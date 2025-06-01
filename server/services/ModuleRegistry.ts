import { CodeGeneratorModule } from '../modules/CodeGeneratorModule';
import { DatabaseConnectorModule } from '../modules/DatabaseConnectorModule';
import { DocumentGenerationModule } from '../modules/DocumentGenerationModule';
import { GoogleTrendsModule } from '../modules/GoogleTrendsModule';
import { ApiConnectorModule } from '../modules/ApiConnectorModule';
import { FileProcessorModule } from '../modules/FileProcessorModule';
import { DataTransformModule } from '../modules/DataTransformModule';
import { WorkflowAutomationModule } from '../modules/WorkflowAutomationModule';

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  category: 'data' | 'integration' | 'automation' | 'processing' | 'communication';
  version: string;
  capabilities: string[];
  requiredSecrets?: string[];
  configSchema: any;
  instance?: any;
}

export class ModuleRegistry {
  private modules: Map<string, ModuleInfo> = new Map();
  private instances: Map<string, any> = new Map();

  constructor() {
    this.registerBuiltInModules();
  }

  private registerBuiltInModules(): void {
    // Code Generator Module
    this.registerModule({
      id: 'code-generator',
      name: 'Code Generator',
      description: 'Generate code in multiple programming languages with documentation and tests',
      category: 'processing',
      version: '1.0.0',
      capabilities: [
        'Multi-language code generation',
        'Automatic documentation',
        'Test generation',
        'Code style formatting',
        'Framework integration'
      ],
      configSchema: {
        type: 'object',
        properties: {
          supportedLanguages: {
            type: 'array',
            items: { type: 'string' },
            default: ['javascript', 'python', 'java', 'sql']
          },
          maxOutputLength: {
            type: 'number',
            default: 10000
          },
          includeComments: {
            type: 'boolean',
            default: true
          },
          includeTests: {
            type: 'boolean',
            default: true
          },
          codeStyle: {
            type: 'object',
            properties: {
              indentation: {
                type: 'string',
                enum: ['spaces', 'tabs'],
                default: 'spaces'
              },
              indentSize: {
                type: 'number',
                default: 2
              },
              maxLineLength: {
                type: 'number',
                default: 100
              }
            }
          }
        }
      }
    });

    // Database Connector Module
    this.registerModule({
      id: 'database-connector',
      name: 'Database Connector',
      description: 'Connect to and query various databases with built-in security controls',
      category: 'data',
      version: '1.0.0',
      capabilities: [
        'Multi-database support',
        'Query validation',
        'Result limiting',
        'Read-only mode',
        'Table access control'
      ],
      requiredSecrets: ['DATABASE_URL'],
      configSchema: {
        type: 'object',
        properties: {
          allowedOperations: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
            },
            default: ['SELECT']
          },
          maxResultRows: {
            type: 'number',
            default: 1000
          },
          queryTimeout: {
            type: 'number',
            default: 30000
          },
          allowedTables: {
            type: 'array',
            items: { type: 'string' },
            default: []
          },
          readOnlyMode: {
            type: 'boolean',
            default: true
          }
        }
      }
    });

    // Document Generation Module
    this.registerModule({
      id: 'document-generator',
      name: 'Document Generator',
      description: 'Generate structured documents in multiple formats with templates',
      category: 'processing',
      version: '1.0.0',
      capabilities: [
        'Multi-format output',
        'Template support',
        'Variable substitution',
        'Section management',
        'Metadata inclusion'
      ],
      configSchema: {
        type: 'object',
        properties: {
          supportedFormats: {
            type: 'array',
            items: { type: 'string' },
            default: ['markdown', 'html', 'confluence', 'json', 'text']
          },
          maxDocumentLength: {
            type: 'number',
            default: 50000
          },
          includeMetadata: {
            type: 'boolean',
            default: true
          },
          templates: {
            type: 'object',
            default: {}
          }
        }
      }
    });

    // Google Trends Module
    this.registerModule({
      id: 'google-trends',
      name: 'Google Trends Analyzer',
      description: 'Analyze trending topics and cross-validate with supplier availability',
      category: 'data',
      version: '1.0.0',
      capabilities: [
        'Trend analysis',
        'Seasonal patterns',
        'Location-based trends',
        'Supplier integration',
        'Hotel recommendations'
      ],
      configSchema: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            default: 'US'
          },
          language: {
            type: 'string',
            default: 'en'
          },
          timeframe: {
            type: 'string',
            default: 'today 12-m'
          },
          category: {
            type: 'number',
            default: 0
          },
          cacheTimeout: {
            type: 'number',
            default: 3600
          }
        }
      }
    });

    // API Connector Module
    this.registerModule({
      id: 'api-connector',
      name: 'API Connector',
      description: 'Connect to external APIs with authentication, rate limiting, and retry logic',
      category: 'integration',
      version: '1.0.0',
      capabilities: [
        'Multi-endpoint support',
        'Authentication handling',
        'Rate limiting',
        'Automatic retries',
        'Response caching',
        'Request validation'
      ],
      configSchema: {
        type: 'object',
        properties: {
          endpoints: {
            type: 'object',
            default: {}
          },
          authentication: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['none', 'bearer', 'basic', 'apikey', 'oauth2'],
                default: 'none'
              }
            }
          },
          rateLimiting: {
            type: 'object',
            properties: {
              requestsPerMinute: {
                type: 'number',
                default: 60
              },
              burstLimit: {
                type: 'number',
                default: 10
              }
            }
          },
          timeout: {
            type: 'number',
            default: 30000
          }
        }
      }
    });

    // File Processor Module
    this.registerModule({
      id: 'file-processor',
      name: 'File Processor',
      description: 'Process files with operations like conversion, compression, and extraction',
      category: 'processing',
      version: '1.0.0',
      capabilities: [
        'Multi-format support',
        'Batch processing',
        'Image processing',
        'Text extraction',
        'File conversion',
        'Compression/decompression'
      ],
      configSchema: {
        type: 'object',
        properties: {
          supportedFormats: {
            type: 'array',
            items: { type: 'string' },
            default: ['.jpg', '.png', '.pdf', '.txt', '.docx', '.xlsx']
          },
          maxFileSize: {
            type: 'number',
            default: 10485760
          },
          outputDirectory: {
            type: 'string',
            default: './processed_files'
          },
          enableBatching: {
            type: 'boolean',
            default: true
          },
          batchSize: {
            type: 'number',
            default: 10
          },
          preserveOriginal: {
            type: 'boolean',
            default: true
          }
        }
      }
    });

    // Data Transform Module
    this.registerModule({
      id: 'data-transform',
      name: 'Data Transformer',
      description: 'Transform, validate, and format data with advanced operations',
      category: 'data',
      version: '1.0.0',
      capabilities: [
        'Data mapping',
        'Filtering and aggregation',
        'Format conversion',
        'Validation rules',
        'Normalization',
        'Multi-format output'
      ],
      configSchema: {
        type: 'object',
        properties: {
          transformations: {
            type: 'object',
            default: {}
          },
          validationRules: {
            type: 'array',
            default: []
          },
          outputFormats: {
            type: 'array',
            items: { type: 'string' },
            default: ['json', 'csv', 'xml', 'yaml']
          },
          enableCaching: {
            type: 'boolean',
            default: true
          },
          cacheTimeout: {
            type: 'number',
            default: 3600
          },
          maxBatchSize: {
            type: 'number',
            default: 1000
          }
        }
      }
    });

    // Workflow Automation Module
    this.registerModule({
      id: 'workflow-automation',
      name: 'Workflow Automation',
      description: 'Automate complex workflows with triggers, conditions, and actions',
      category: 'automation',
      version: '1.0.0',
      capabilities: [
        'Multi-step workflows',
        'Trigger management',
        'Conditional logic',
        'Error handling',
        'Parallel execution',
        'Scheduled tasks'
      ],
      configSchema: {
        type: 'object',
        properties: {
          workflows: {
            type: 'object',
            default: {}
          },
          triggers: {
            type: 'array',
            default: []
          },
          actions: {
            type: 'array',
            default: []
          },
          conditions: {
            type: 'array',
            default: []
          },
          maxExecutionTime: {
            type: 'number',
            default: 300000
          },
          enableScheduling: {
            type: 'boolean',
            default: true
          }
        }
      }
    });
  }

  private registerModule(moduleInfo: ModuleInfo): void {
    this.modules.set(moduleInfo.id, moduleInfo);
  }

  public getModule(id: string): ModuleInfo | undefined {
    return this.modules.get(id);
  }

  public getAllModules(): ModuleInfo[] {
    return Array.from(this.modules.values());
  }

  public getModulesByCategory(category: string): ModuleInfo[] {
    return Array.from(this.modules.values()).filter(m => m.category === category);
  }

  public createModuleInstance(id: string, config: any): any {
    const moduleInfo = this.modules.get(id);
    if (!moduleInfo) {
      throw new Error(`Module '${id}' not found`);
    }

    // Validate config against schema
    this.validateConfig(config, moduleInfo.configSchema);

    let instance;
    switch (id) {
      case 'code-generator':
        instance = new CodeGeneratorModule(config);
        break;
      case 'database-connector':
        instance = new DatabaseConnectorModule(config);
        break;
      case 'document-generator':
        instance = new DocumentGenerationModule(config);
        break;
      case 'google-trends':
        instance = new GoogleTrendsModule(config);
        break;
      case 'api-connector':
        instance = new ApiConnectorModule(config);
        break;
      case 'file-processor':
        instance = new FileProcessorModule(config);
        break;
      case 'data-transform':
        instance = new DataTransformModule(config);
        break;
      case 'workflow-automation':
        instance = new WorkflowAutomationModule(config);
        break;
      default:
        throw new Error(`Module implementation not found for '${id}'`);
    }

    this.instances.set(`${id}-${Date.now()}`, instance);
    return instance;
  }

  public getModuleInstance(instanceId: string): any {
    return this.instances.get(instanceId);
  }

  private validateConfig(config: any, schema: any): void {
    // Basic schema validation - in production use a proper JSON schema validator
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          throw new Error(`Required field '${field}' missing in module configuration`);
        }
      }
    }
  }

  public getModuleCapabilities(id: string): string[] {
    const module = this.modules.get(id);
    return module?.capabilities || [];
  }

  public getRequiredSecrets(id: string): string[] {
    const module = this.modules.get(id);
    return module?.requiredSecrets || [];
  }

  public isModuleAvailable(id: string): boolean {
    return this.modules.has(id);
  }

  public getDefaultConfig(id: string): any {
    const module = this.modules.get(id);
    if (!module) return {};

    const defaultConfig: any = {};
    const schema = module.configSchema;

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties as any)) {
        if ((prop as any).default !== undefined) {
          defaultConfig[key] = (prop as any).default;
        }
      }
    }

    return defaultConfig;
  }
}

export const moduleRegistry = new ModuleRegistry();