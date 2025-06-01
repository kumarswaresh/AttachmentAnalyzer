#!/usr/bin/env node

// Standalone seeding script for local development
// Usage: node seed-local.js
// Make sure your DATABASE_URL environment variable is set

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/agent_platform'
});

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');
    
    // Module definitions
    await seedModuleDefinitions(client);
    
    // Sample agents
    await seedAgents(client);
    
    // Agent templates
    await seedAgentTemplates(client);
    
    // Test user
    await seedTestUser(client);
    
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedModuleDefinitions(client) {
  const modules = [
    {
      id: 'prompt-module',
      name: 'Prompt Module',
      version: '2.1.0',
      description: 'Advanced prompt engineering and template management',
      type: 'core',
      schema: {
        type: 'object',
        properties: {
          templateId: { type: 'string' },
          variables: { type: 'object' },
          context: { type: 'array' }
        }
      },
      dependencies: [],
      status: 'stable'
    },
    {
      id: 'recommendation-module',
      name: 'Recommendation Module',
      version: '1.8.2',
      description: 'Generate intelligent recommendations based on data analysis',
      type: 'analysis',
      schema: {
        type: 'object',
        properties: {
          context: { type: 'string' },
          userProfile: { type: 'object' },
          filters: { type: 'object' }
        }
      },
      dependencies: ['prompt-module'],
      status: 'stable'
    },
    {
      id: 'database-connector',
      name: 'Database Connector',
      version: '3.0.1',
      description: 'Secure database connections with query validation',
      type: 'integration',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          operation: { type: 'string' },
          table: { type: 'string' }
        }
      },
      dependencies: [],
      status: 'stable'
    },
    {
      id: 'mcp-connector',
      name: 'MCP Connector',
      version: '2.0.0',
      description: 'Connect to external services via Model Context Protocol',
      type: 'integration',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          method: { type: 'string' },
          headers: { type: 'object' }
        }
      },
      dependencies: [],
      status: 'stable'
    },
    {
      id: 'logging-module',
      name: 'Logging Module',
      version: '1.5.0',
      description: 'Comprehensive logging and monitoring capabilities',
      type: 'core',
      schema: {
        type: 'object',
        properties: {
          level: { type: 'string' },
          message: { type: 'string' },
          metadata: { type: 'object' }
        }
      },
      dependencies: [],
      status: 'stable'
    }
  ];

  for (const module of modules) {
    await client.query(`
      INSERT INTO module_definitions (id, name, version, description, type, schema, dependencies, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [
      module.id,
      module.name,
      module.version,
      module.description,
      module.type,
      JSON.stringify(module.schema),
      JSON.stringify(module.dependencies),
      module.status
    ]);
  }
  
  console.log('✓ Module definitions seeded');
}

async function seedAgents(client) {
  const agents = [
    {
      name: 'Marketing Agent',
      goal: 'Recommend multi-channel campaign content that maximises CVR',
      role: 'Marketing Campaign Specialist',
      guardrails: {
        requireHumanApproval: false,
        contentFiltering: true,
        readOnlyMode: false,
        maxTokens: 4000,
        allowedDomains: ['marketing.company.com'],
        blockedKeywords: ['competitor']
      },
      modules: [
        {
          moduleId: 'prompt-module',
          version: '2.1.0',
          config: {
            templates: {
              campaign_analysis: 'Analyze the following campaign data and provide recommendations: {{data}}'
            }
          },
          enabled: true
        },
        {
          moduleId: 'recommendation-module',
          version: '1.8.2',
          config: {
            algorithm: 'hybrid',
            maxRecommendations: 5,
            confidenceThreshold: 0.7
          },
          enabled: true
        }
      ],
      model: 'gpt-4o',
      vectorStoreId: 'marketing-vector-store',
      status: 'active'
    },
    {
      name: 'Release Notes Agent',
      goal: 'Generate Confluence-ready release notes matching existing template',
      role: 'Technical Documentation Specialist',
      guardrails: {
        requireHumanApproval: true,
        contentFiltering: true,
        readOnlyMode: true,
        maxTokens: 3000,
        allowedDomains: ['confluence.company.com', 'jira.company.com'],
        blockedKeywords: ['confidential', 'internal']
      },
      modules: [
        {
          moduleId: 'prompt-module',
          version: '2.1.0',
          config: {
            templates: {
              release_notes: 'Generate release notes for version {{version}} with the following changes: {{changes}}'
            }
          },
          enabled: true
        },
        {
          moduleId: 'mcp-connector',
          version: '2.0.0',
          config: {
            timeout: 30000,
            retries: 3
          },
          enabled: true
        }
      ],
      model: 'gpt-4o',
      vectorStoreId: 'release-notes-vector-store',
      status: 'active'
    },
    {
      name: 'Hotel Booking Agent',
      goal: 'Provide personalized hotel recommendations and booking assistance',
      role: 'Travel Specialist',
      guardrails: {
        requireHumanApproval: false,
        contentFiltering: true,
        readOnlyMode: false,
        maxTokens: 3500,
        allowedDomains: ['booking.com', 'hotels.com'],
        blockedKeywords: ['fake', 'scam']
      },
      modules: [
        {
          moduleId: 'recommendation-module',
          version: '1.8.2',
          config: {
            algorithm: 'collaborative',
            maxRecommendations: 10,
            confidenceThreshold: 0.8
          },
          enabled: true
        },
        {
          moduleId: 'mcp-connector',
          version: '2.0.0',
          config: {
            timeout: 25000,
            retries: 2
          },
          enabled: true
        }
      ],
      model: 'gpt-4o',
      vectorStoreId: 'hotel-vector-store',
      status: 'active'
    }
  ];

  for (const agent of agents) {
    await client.query(`
      INSERT INTO agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      agent.name,
      agent.goal,
      agent.role,
      JSON.stringify(agent.guardrails),
      JSON.stringify(agent.modules),
      agent.model,
      agent.vectorStoreId,
      agent.status
    ]);
  }
  
  console.log('✓ Sample agents seeded');
}

async function seedAgentTemplates(client) {
  const templates = [
    {
      name: 'Marketing Campaign Agent',
      description: 'Template for creating marketing campaign analysis agents',
      baseConfig: {
        modules: [
          { moduleId: 'recommendation-module', enabled: true },
          { moduleId: 'prompt-module', enabled: true }
        ],
        guardrails: {
          maxTokens: 4000,
          contentFiltering: true
        }
      },
      category: 'marketing',
      isPublic: true
    },
    {
      name: 'Documentation Agent',
      description: 'Template for creating technical documentation agents',
      baseConfig: {
        modules: [
          { moduleId: 'prompt-module', enabled: true },
          { moduleId: 'mcp-connector', enabled: true }
        ],
        guardrails: {
          requireHumanApproval: true,
          maxTokens: 3000
        }
      },
      category: 'documentation',
      isPublic: true
    }
  ];

  for (const template of templates) {
    await client.query(`
      INSERT INTO agent_templates (name, description, base_config, category, is_public, created_by)
      VALUES ($1, $2, $3, $4, $5, 1)
      ON CONFLICT (name) DO NOTHING
    `, [
      template.name,
      template.description,
      JSON.stringify(template.baseConfig),
      template.category,
      template.isPublic
    ]);
  }
  
  console.log('✓ Agent templates seeded');
}

async function seedTestUser(client) {
  await client.query(`
    INSERT INTO users (username, email, password_hash, role, is_active)
    VALUES ('demo_user', 'demo@example.com', '$2b$10$example_hash_placeholder', 'user', true)
    ON CONFLICT (username) DO NOTHING
  `);
  
  console.log('✓ Test user created');
}

// Run the seeding
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };