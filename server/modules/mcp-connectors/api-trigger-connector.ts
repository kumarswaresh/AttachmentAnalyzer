import { BaseMCPConnector } from './base-connector';
import { nanoid } from 'nanoid';

export interface TriggerConfig {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  schema?: any;
  authentication?: 'none' | 'api_key' | 'bearer';
  apiKey?: string;
  active: boolean;
  createdAt: Date;
}

export interface TriggerEvent {
  triggerId: string;
  timestamp: Date;
  method: string;
  headers: Record<string, any>;
  body: any;
  query: Record<string, any>;
  ip: string;
}

export class APITriggerConnector extends BaseMCPConnector {
  private triggers: Map<string, TriggerConfig> = new Map();
  private events: TriggerEvent[] = [];
  private maxEvents = 1000;

  constructor(config: any) {
    super({
      id: 'api-trigger',
      name: 'API Trigger',
      description: 'Auto-generated API endpoints for webhook triggers and external integrations',
      category: 'integration',
      type: 'trigger',
      ...config
    });
  }

  async createTrigger(config: Omit<TriggerConfig, 'id' | 'createdAt'>): Promise<TriggerConfig> {
    const trigger: TriggerConfig = {
      id: nanoid(),
      createdAt: new Date(),
      ...config
    };

    this.triggers.set(trigger.id, trigger);
    return trigger;
  }

  async updateTrigger(id: string, updates: Partial<TriggerConfig>): Promise<TriggerConfig> {
    const trigger = this.triggers.get(id);
    if (!trigger) {
      throw new Error(`Trigger ${id} not found`);
    }

    const updatedTrigger = { ...trigger, ...updates };
    this.triggers.set(id, updatedTrigger);
    return updatedTrigger;
  }

  async deleteTrigger(id: string): Promise<void> {
    if (!this.triggers.has(id)) {
      throw new Error(`Trigger ${id} not found`);
    }
    this.triggers.delete(id);
  }

  async getTrigger(id: string): Promise<TriggerConfig | null> {
    return this.triggers.get(id) || null;
  }

  async listTriggers(): Promise<TriggerConfig[]> {
    return Array.from(this.triggers.values());
  }

  async handleTriggerRequest(
    triggerId: string, 
    method: string, 
    headers: Record<string, any>, 
    body: any, 
    query: Record<string, any>,
    ip: string
  ): Promise<any> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`Trigger ${triggerId} not found`);
    }

    if (!trigger.active) {
      throw new Error(`Trigger ${triggerId} is inactive`);
    }

    if (trigger.method !== method) {
      throw new Error(`Method ${method} not allowed for trigger ${triggerId}`);
    }

    // Authentication check
    if (trigger.authentication === 'api_key') {
      const apiKey = headers['x-api-key'] || query.api_key;
      if (!apiKey || apiKey !== trigger.apiKey) {
        throw new Error('Invalid API key');
      }
    } else if (trigger.authentication === 'bearer') {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Bearer token required');
      }
    }

    // Log the event
    const event: TriggerEvent = {
      triggerId,
      timestamp: new Date(),
      method,
      headers,
      body,
      query,
      ip
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    return {
      success: true,
      triggerId,
      timestamp: event.timestamp,
      data: body
    };
  }

  async getTriggerEvents(triggerId?: string, limit: number = 100): Promise<TriggerEvent[]> {
    let events = this.events;
    if (triggerId) {
      events = events.filter(event => event.triggerId === triggerId);
    }
    return events.slice(0, limit);
  }

  async processMessage(message: any): Promise<any> {
    const { action, params } = message;

    switch (action) {
      case 'create_trigger':
        return await this.createTrigger(params);
      
      case 'update_trigger':
        return await this.updateTrigger(params.id, params.updates);
      
      case 'delete_trigger':
        await this.deleteTrigger(params.id);
        return { success: true };
      
      case 'get_trigger':
        return await this.getTrigger(params.id);
      
      case 'list_triggers':
        return await this.listTriggers();
      
      case 'get_events':
        return await this.getTriggerEvents(params.triggerId, params.limit);
      
      case 'handle_request':
        return await this.handleTriggerRequest(
          params.triggerId,
          params.method,
          params.headers,
          params.body,
          params.query,
          params.ip
        );

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getEndpoints() {
    return [
      {
        path: '/triggers',
        method: 'GET' as const,
        description: 'List all triggers',
        schema: {
          type: 'object',
          properties: {}
        }
      },
      {
        path: '/triggers',
        method: 'POST' as const,
        description: 'Create a new trigger',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Trigger name' },
            description: { type: 'string', description: 'Trigger description' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
            path: { type: 'string', description: 'Trigger path' },
            authentication: { type: 'string', enum: ['none', 'api_key', 'bearer'], default: 'none' },
            apiKey: { type: 'string', description: 'API key for authentication' },
            active: { type: 'boolean', default: true }
          },
          required: ['name', 'method', 'path']
        }
      },
      {
        path: '/triggers/:id',
        method: 'PUT' as const,
        description: 'Update a trigger',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            active: { type: 'boolean' }
          }
        }
      },
      {
        path: '/triggers/:id',
        method: 'DELETE' as const,
        description: 'Delete a trigger',
        schema: {
          type: 'object',
          properties: {}
        }
      },
      {
        path: '/triggers/:id/events',
        method: 'GET' as const,
        description: 'Get trigger events',
        schema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 100 }
          }
        }
      }
    ];
  }

  getCapabilities() {
    return [
      'webhook_creation',
      'api_endpoint_generation',
      'request_logging',
      'authentication',
      'event_tracking',
      'dynamic_routing'
    ];
  }
}