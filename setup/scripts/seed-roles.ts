import { config } from 'dotenv';
config();

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Configure neon for serverless
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

const predefinedRoles = [
  {
    name: "Super Admin",
    description: "Full system access with all administrative privileges",
    is_system_role: true,
    permissions: ["admin:*", "user:*", "agent:*", "deployment:*", "api:*", "credential:*"],
    resource_limits: {
      maxAgents: 999999,
      maxDeployments: 999999,
      maxApiKeys: 999999,
      maxCredentials: 999999,
      dailyApiCalls: 999999,
      monthlyCost: 999999
    }
  },
  {
    name: "Organization Admin",
    description: "Administrative access within organization scope",
    is_system_role: true,
    permissions: ["user:create", "user:read", "user:update", "agent:*", "deployment:*", "api:*"],
    resource_limits: {
      maxAgents: 100,
      maxDeployments: 50,
      maxApiKeys: 25,
      maxCredentials: 50,
      dailyApiCalls: 100000,
      monthlyCost: 1000
    }
  },
  {
    name: "Agent Developer",
    description: "Can create, modify, and deploy agents",
    is_system_role: true,
    permissions: ["agent:*", "deployment:create", "deployment:read", "deployment:update", "api:create", "api:read"],
    resource_limits: {
      maxAgents: 25,
      maxDeployments: 15,
      maxApiKeys: 10,
      maxCredentials: 20,
      dailyApiCalls: 50000,
      monthlyCost: 500
    }
  },
  {
    name: "API User",
    description: "API access with rate limiting",
    is_system_role: true,
    permissions: ["api:read", "agent:read", "deployment:read"],
    resource_limits: {
      maxAgents: 0,
      maxDeployments: 0,
      maxApiKeys: 5,
      maxCredentials: 10,
      dailyApiCalls: 10000,
      monthlyCost: 100
    }
  },
  {
    name: "Standard User",
    description: "Basic platform access",
    is_system_role: true,
    permissions: ["agent:read", "deployment:read"],
    resource_limits: {
      maxAgents: 5,
      maxDeployments: 3,
      maxApiKeys: 2,
      maxCredentials: 5,
      dailyApiCalls: 5000,
      monthlyCost: 50
    }
  },
  {
    name: "Viewer",
    description: "Read-only access to assigned resources",
    is_system_role: true,
    permissions: ["agent:read", "deployment:read"],
    resource_limits: {
      maxAgents: 0,
      maxDeployments: 0,
      maxApiKeys: 1,
      maxCredentials: 2,
      dailyApiCalls: 1000,
      monthlyCost: 10
    }
  }
];

async function seedRoles() {
  console.log('Seeding roles...');
  
  try {
    // Clear existing roles
    await pool.query('DELETE FROM roles');
    console.log('Cleared existing roles');
    
    // Insert predefined roles
    for (const role of predefinedRoles) {
      await pool.query(`
        INSERT INTO roles (name, description, is_system_role, permissions, resource_limits)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        role.name,
        role.description,
        role.is_system_role,
        role.permissions,
        JSON.stringify(role.resource_limits)
      ]);
      console.log(`Created role: ${role.name}`);
    }
    
    console.log('✅ Roles seeded successfully');
    
    // Verify roles were created
    const result = await pool.query('SELECT COUNT(*) as count FROM roles');
    console.log(`Total roles created: ${result.rows[0].count}`);
    
    return result.rows;
  } catch (error) {
    console.error('Error seeding roles:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRoles().then(() => {
    console.log('Role seeding completed');
    process.exit(0);
  }).catch(error => {
    console.error('Role seeding failed:', error);
    process.exit(1);
  });
}

export { seedRoles };