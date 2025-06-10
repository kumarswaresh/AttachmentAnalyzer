/**
 * Seed script to create predefined roles for Super Admin, Admin, and Client users
 */
import { config } from 'dotenv';
config(); // Load environment variables from .env file

import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seedRoles() {
  console.log('Starting role seeding...');

  try {
    // Define predefined roles
    const predefinedRoles = [
      {
        name: "Super Admin",
        description: "Full system access with all administrative privileges",
        isSystemRole: true,
        permissions: [
          "admin:*", "user:*", "agent:*", "deployment:*", "api:*", 
          "credential:*", "organization:*", "billing:*", "system:*"
        ],
        featureAccess: {
          agentBuilder: true,
          visualBuilder: true,
          mcpIntegrations: true,
          apiManagement: true,
          userManagement: true,
          analytics: true,
          deployments: true,
          credentials: true,
          billing: true,
          systemSettings: true,
          crossTenantAccess: true
        },
        resourceLimits: {
          maxAgents: null,
          maxDeployments: null,
          maxApiKeys: null,
          maxCredentials: null,
          dailyApiCalls: null,
          monthlyCost: null
        }
      },
      {
        name: "Organization Admin",
        description: "Administrative access within organization scope",
        isSystemRole: true,
        permissions: [
          "user:create", "user:read", "user:update", "user:delete",
          "agent:create", "agent:read", "agent:update", "agent:delete",
          "deployment:create", "deployment:read", "deployment:update", "deployment:delete",
          "api:create", "api:read", "api:update", "api:delete",
          "credential:create", "credential:read", "credential:update", "credential:delete",
          "organization:read", "organization:update", "billing:read"
        ],
        featureAccess: {
          agentBuilder: true,
          visualBuilder: true,
          mcpIntegrations: true,
          apiManagement: true,
          userManagement: true,
          analytics: true,
          deployments: true,
          credentials: true,
          billing: false,
          systemSettings: false,
          crossTenantAccess: false
        },
        resourceLimits: {
          maxAgents: 100,
          maxDeployments: 50,
          maxApiKeys: 25,
          maxCredentials: 50,
          dailyApiCalls: 100000,
          monthlyCost: 10000
        }
      },
      {
        name: "Client Admin",
        description: "Client-level administrative access with limited privileges",
        isSystemRole: true,
        permissions: [
          "user:read", "user:update",
          "agent:create", "agent:read", "agent:update", "agent:delete",
          "deployment:create", "deployment:read", "deployment:update", "deployment:delete",
          "api:create", "api:read", "api:update",
          "credential:create", "credential:read", "credential:update", "credential:delete"
        ],
        featureAccess: {
          agentBuilder: true,
          visualBuilder: true,
          mcpIntegrations: true,
          apiManagement: true,
          userManagement: false,
          analytics: true,
          deployments: true,
          credentials: true,
          billing: false,
          systemSettings: false,
          crossTenantAccess: false
        },
        resourceLimits: {
          maxAgents: 50,
          maxDeployments: 25,
          maxApiKeys: 15,
          maxCredentials: 30,
          dailyApiCalls: 50000,
          monthlyCost: 5000
        }
      },
      {
        name: "Standard User",
        description: "Basic access for regular platform users",
        isSystemRole: true,
        permissions: [
          "agent:create", "agent:read", "agent:update", "agent:delete",
          "deployment:create", "deployment:read", "deployment:update", "deployment:delete",
          "api:read", "credential:create", "credential:read", "credential:update"
        ],
        featureAccess: {
          agentBuilder: true,
          visualBuilder: false,
          mcpIntegrations: true,
          apiManagement: false,
          userManagement: false,
          analytics: true,
          deployments: true,
          credentials: true,
          billing: false,
          systemSettings: false,
          crossTenantAccess: false
        },
        resourceLimits: {
          maxAgents: 25,
          maxDeployments: 10,
          maxApiKeys: 5,
          maxCredentials: 15,
          dailyApiCalls: 25000,
          monthlyCost: 2500
        }
      },
      {
        name: "Read Only",
        description: "View-only access with no modification privileges",
        isSystemRole: true,
        permissions: [
          "agent:read", "deployment:read", "api:read", "credential:read"
        ],
        featureAccess: {
          agentBuilder: false,
          visualBuilder: false,
          mcpIntegrations: false,
          apiManagement: false,
          userManagement: false,
          analytics: true,
          deployments: false,
          credentials: false,
          billing: false,
          systemSettings: false,
          crossTenantAccess: false
        },
        resourceLimits: {
          maxAgents: 0,
          maxDeployments: 0,
          maxApiKeys: 3,
          maxCredentials: 5,
          dailyApiCalls: 5000,
          monthlyCost: 500
        }
      },
      {
        name: "Developer",
        description: "Development-focused role with agent and deployment access",
        isSystemRole: true,
        permissions: [
          "agent:create", "agent:read", "agent:update", "agent:delete",
          "deployment:create", "deployment:read", "deployment:update", "deployment:delete",
          "api:create", "api:read", "api:update",
          "credential:create", "credential:read", "credential:update"
        ],
        featureAccess: {
          agentBuilder: true,
          visualBuilder: true,
          mcpIntegrations: true,
          apiManagement: true,
          userManagement: false,
          analytics: true,
          deployments: true,
          credentials: true,
          billing: false,
          systemSettings: false,
          crossTenantAccess: false
        },
        resourceLimits: {
          maxAgents: 75,
          maxDeployments: 30,
          maxApiKeys: 10,
          maxCredentials: 25,
          dailyApiCalls: 75000,
          monthlyCost: 7500
        }
      }
    ];

    // Insert or update roles
    for (const roleData of predefinedRoles) {
      try {
        // Check if role already exists
        const existingRole = await db.select()
          .from(schema.roles)
          .where(eq(schema.roles.name, roleData.name))
          .limit(1);

        if (existingRole.length > 0) {
          // Update existing role
          await db.update(schema.roles)
            .set({
              description: roleData.description,
              permissions: roleData.permissions,
              featureAccess: roleData.featureAccess,
              resourceLimits: roleData.resourceLimits,
              updatedAt: new Date()
            })
            .where(eq(schema.roles.name, roleData.name));
          
          console.log(`Updated role: ${roleData.name}`);
        } else {
          // Create new role
          await db.insert(schema.roles).values({
            name: roleData.name,
            description: roleData.description,
            isSystemRole: roleData.isSystemRole,
            permissions: roleData.permissions,
            featureAccess: roleData.featureAccess,
            resourceLimits: roleData.resourceLimits,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log(`Created role: ${roleData.name}`);
        }
      } catch (error) {
        console.error(`Error processing role ${roleData.name}:`, error);
      }
    }

    console.log('Role seeding completed successfully');
  } catch (error) {
    console.error('Error seeding roles:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRoles()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedRoles };