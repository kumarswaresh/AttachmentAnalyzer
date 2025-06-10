import { config } from 'dotenv';
config(); // Load environment variables from .env file

import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { users, organizations, roles, organizationMembers, agents, agentApps } from '@shared/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Setup complete demo environment with 3 admins, 5 clients, and users with specific access
export async function setupDemoUsers() {
  console.log('Setting up demo users and organizations...');

  try {
    // Create 5 client organizations
    const clientOrgs = [
      { name: 'TechCorp Solutions', description: 'Enterprise software development company', settings: { maxAgents: 50, maxUsers: 25 }},
      { name: 'Digital Marketing Pro', description: 'Digital marketing and advertising agency', settings: { maxAgents: 30, maxUsers: 15 }},
      { name: 'FinanceWise Inc', description: 'Financial services and consulting', settings: { maxAgents: 40, maxUsers: 20 }},
      { name: 'HealthTech Innovations', description: 'Healthcare technology solutions', settings: { maxAgents: 35, maxUsers: 18 }},
      { name: 'EduLearn Platform', description: 'Online education and training platform', settings: { maxAgents: 25, maxUsers: 12 }}
    ];

    const createdOrgs = [];
    for (const org of clientOrgs) {
      const [createdOrg] = await db.insert(organizations).values({
        name: org.name,
        description: org.description,
        settings: org.settings,
        isActive: true
      }).returning();
      createdOrgs.push(createdOrg);
      console.log(`Created organization: ${createdOrg.name}`);
    }

    // Create roles with specific permissions
    const rolesData = [
      {
        name: 'SuperAdmin',
        description: 'Full system access across all organizations',
        isSystemRole: true,
        permissions: ['*'],
        resourceLimits: { maxAgents: -1, maxUsers: -1, maxCredits: -1 }
      },
      {
        name: 'ClientAdmin',
        description: 'Full access within organization',
        isSystemRole: false,
        permissions: ['agents:*', 'users:*', 'credentials:*', 'billing:read', 'analytics:read'],
        resourceLimits: { maxAgents: 50, maxUsers: 25, maxCredits: 10000 }
      },
      {
        name: 'AgentDeveloper',
        description: 'Can create and manage agents',
        isSystemRole: false,
        permissions: ['agents:create', 'agents:read', 'agents:update', 'credentials:read'],
        resourceLimits: { maxAgents: 10, maxUsers: 0, maxCredits: 1000 }
      },
      {
        name: 'AgentUser',
        description: 'Can execute agents and view basic data',
        isSystemRole: false,
        permissions: ['agents:read', 'agents:execute', 'apps:read', 'apps:execute'],
        resourceLimits: { maxAgents: 0, maxUsers: 0, maxCredits: 500 }
      },
      {
        name: 'Viewer',
        description: 'Read-only access to basic features',
        isSystemRole: false,
        permissions: ['agents:read', 'apps:read'],
        resourceLimits: { maxAgents: 0, maxUsers: 0, maxCredits: 100 }
      }
    ];

    const createdRoles = [];
    for (const role of rolesData) {
      const [createdRole] = await db.insert(roles).values(role).returning();
      createdRoles.push(createdRole);
      console.log(`Created role: ${createdRole.name}`);
    }

    // Create 3 SuperAdmin users
    const superAdmins = [
      { username: 'superadmin1', email: 'superadmin1@platform.com', globalRole: 'superadmin' },
      { username: 'superadmin2', email: 'superadmin2@platform.com', globalRole: 'superadmin' },
      { username: 'superadmin3', email: 'superadmin3@platform.com', globalRole: 'superadmin' }
    ];

    for (const admin of superAdmins) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const [createdUser] = await db.insert(users).values({
        ...admin,
        password: hashedPassword,
        isActive: true,
        metadata: {
          preferences: { theme: 'dark', notifications: true },
          notifications: { email: true, push: false },
          timezone: 'UTC'
        }
      }).returning();
      console.log(`Created SuperAdmin: ${createdUser.username}`);
    }

    // Create users for each organization with different roles
    const userTemplates = [
      { role: 'ClientAdmin', count: 1, prefix: 'admin' },
      { role: 'AgentDeveloper', count: 2, prefix: 'dev' },
      { role: 'AgentUser', count: 3, prefix: 'user' },
      { role: 'Viewer', count: 2, prefix: 'viewer' }
    ];

    for (const org of createdOrgs) {
      console.log(`Creating users for ${org.name}...`);
      
      for (const template of userTemplates) {
        const role = createdRoles.find(r => r.name === template.role);
        if (!role) continue;

        for (let i = 1; i <= template.count; i++) {
          const username = `${template.prefix}${i}_${org.name.toLowerCase().replace(/\s+/g, '')}`;
          const email = `${username}@${org.name.toLowerCase().replace(/\s+/g, '')}.com`;
          
          const hashedPassword = await bcrypt.hash('password123', 10);
          const [createdUser] = await db.insert(users).values({
            username,
            email,
            password: hashedPassword,
            globalRole: template.role === 'ClientAdmin' ? 'admin' : 'user',
            organizationId: org.id,
            isActive: true,
            metadata: {
              preferences: { theme: 'light', notifications: true },
              notifications: { email: true, push: true },
              timezone: 'UTC'
            }
          }).returning();

          // Add user to organization with role
          await db.insert(organizationMembers).values({
            userId: createdUser.id,
            organizationId: org.id,
            roleId: role.id,
            isActive: true
          });

          console.log(`  Created ${template.role}: ${username}`);
        }
      }

      // Create sample agents for each organization
      const agentTemplates = [
        { name: 'Customer Support Agent', role: 'customer_support', goal: 'Provide excellent customer service' },
        { name: 'Sales Assistant', role: 'sales_assistant', goal: 'Help with sales inquiries and lead qualification' },
        { name: 'Data Analyst', role: 'data_analyst', goal: 'Analyze business data and provide insights' }
      ];

      for (const agentTemplate of agentTemplates) {
        const [createdAgent] = await db.insert(agents).values({
          id: crypto.randomUUID(),
          name: `${agentTemplate.name} - ${org.name}`,
          goal: agentTemplate.goal,
          role: agentTemplate.role,
          userId: 1, // Default user
          organizationId: org.id,
          guardrails: {
            requireHumanApproval: false,
            contentFiltering: true,
            readOnlyMode: false,
            maxTokens: 2000,
            allowedDomains: ['*'],
            blockedKeywords: ['sensitive', 'confidential']
          },
          modules: [],
          modelId: 'gpt-4',
          isActive: true,
          isPublic: false
        }).returning();

        console.log(`  Created agent: ${createdAgent.name}`);
      }

      // Create sample agent apps for each organization
      const appTemplates = [
        { name: 'Customer Onboarding App', category: 'customer_service', description: 'Automated customer onboarding process' },
        { name: 'Lead Qualification App', category: 'sales', description: 'Qualify and score potential leads' },
        { name: 'Report Generator App', category: 'analytics', description: 'Generate business reports automatically' }
      ];

      for (const appTemplate of appTemplates) {
        const [createdApp] = await db.insert(agentApps).values({
          id: crypto.randomUUID(),
          name: `${appTemplate.name} - ${org.name}`,
          description: appTemplate.description,
          category: appTemplate.category,
          flowDefinition: [
            { id: 'start', type: 'trigger', config: { event: 'user_input' } },
            { id: 'process', type: 'agent', config: { agentId: 'auto-assign' } },
            { id: 'end', type: 'response', config: { format: 'json' } }
          ],
          isActive: true,
          isPublic: false,
          organizationId: org.id,
          createdBy: 1,
          executionCount: Math.floor(Math.random() * 100),
          avgExecutionTime: Math.floor(Math.random() * 5000) + 1000
        }).returning();

        console.log(`  Created app: ${createdApp.name}`);
      }
    }

    console.log('\n✅ Demo setup completed successfully!');
    console.log('\nCreated:');
    console.log(`- 3 SuperAdmin users`);
    console.log(`- 5 Client organizations`);
    console.log(`- 8 users per organization (1 admin, 2 developers, 3 users, 2 viewers)`);
    console.log(`- 3 agents per organization`);
    console.log(`- 3 agent apps per organization`);
    console.log(`- Role-based access controls configured`);

    return {
      organizations: createdOrgs,
      roles: createdRoles,
      summary: {
        totalOrganizations: createdOrgs.length,
        totalRoles: createdRoles.length,
        totalUsersPerOrg: 8,
        totalAgentsPerOrg: 3,
        totalAppsPerOrg: 3
      }
    };

  } catch (error) {
    console.error('Error setting up demo users:', error);
    throw error;
  }
}

// Run the setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDemoUsers().then(() => {
    console.log('Setup completed');
    process.exit(0);
  }).catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}