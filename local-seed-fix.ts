#!/usr/bin/env tsx

/**
 * Simple Local Seeding Script for macOS
 * Uses standard PostgreSQL driver instead of Neon serverless
 */

import { config } from 'dotenv';
config();

import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './shared/schema';
import bcrypt from 'bcryptjs';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false 
});
const db = drizzle(pool, { schema });

async function seedBasicData() {
  console.log('🌱 Starting local database seeding...\n');
  
  try {
    // 1. Create basic roles
    console.log('Creating system roles...');
    
    const basicRoles = [
      {
        name: "Super Admin",
        description: "Full system access with all administrative privileges",
        isSystemRole: true,
        permissions: ["*"],
        featureAccess: {
          canCreateUsers: true,
          canManageRoles: true,
          canAccessBilling: true,
          maxAgents: null,
          maxCredentials: null,
          maxDeployments: null,
          maxApiCallsPerDay: null
        },
        resourceLimits: null
      },
      {
        name: "Admin",
        description: "Administrative access with user management capabilities",
        isSystemRole: false,
        permissions: ["users.read", "users.write", "agents.read", "agents.write"],
        featureAccess: {
          canCreateUsers: true,
          canManageRoles: false,
          canAccessBilling: false,
          maxAgents: 100,
          maxCredentials: 50,
          maxDeployments: 10,
          maxApiCallsPerDay: 10000
        },
        resourceLimits: {
          maxAgents: 100,
          maxCredentials: 50,
          maxDeployments: 10,
          maxApiCallsPerDay: 10000
        }
      },
      {
        name: "User",
        description: "Standard user access with basic functionality",
        isSystemRole: false,
        permissions: ["agents.read", "agents.write"],
        featureAccess: {
          canCreateUsers: false,
          canManageRoles: false,
          canAccessBilling: false,
          maxAgents: 10,
          maxCredentials: 5,
          maxDeployments: 2,
          maxApiCallsPerDay: 1000
        },
        resourceLimits: {
          maxAgents: 10,
          maxCredentials: 5,
          maxDeployments: 2,
          maxApiCallsPerDay: 1000
        }
      }
    ];

    for (const role of basicRoles) {
      try {
        await db.insert(schema.roles).values({
          name: role.name,
          description: role.description,
          isSystemRole: role.isSystemRole,
          permissions: role.permissions,
          featureAccess: role.featureAccess,
          resourceLimits: role.resourceLimits,
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();
        
        console.log(`✓ Created role: ${role.name}`);
      } catch (error) {
        console.log(`⚠️  Role ${role.name} may already exist`);
      }
    }

    // 2. Create default organization
    console.log('\nCreating default organization...');
    
    const [org] = await db.insert(schema.organizations).values({
      name: "Default Organization",
      description: "Default organization for local development",
      settings: {
        maxAgents: 100,
        maxUsers: 50
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning().onConflictDoNothing();
    
    if (org) {
      console.log(`✓ Created organization: ${org.name}`);
    }

    // 3. Create admin user
    console.log('\nCreating admin user...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const [adminUser] = await db.insert(schema.users).values({
      username: "admin",
      email: "admin@platform.local",
      passwordHash: hashedPassword,
      role: "Super Admin",
      isActive: true,
      organizationId: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning().onConflictDoNothing();
    
    if (adminUser) {
      console.log(`✓ Created admin user: ${adminUser.username}`);
    }

    console.log('\n🎉 Local seeding completed successfully!');
    console.log('\n🔑 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n🚀 Start your app: npm run dev');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Check database connection first
async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. PostgreSQL is running: brew services start postgresql@15');
    console.log('   2. Database exists: createdb agent_platform');
    console.log('   3. .env has correct DATABASE_URL');
    return false;
  }
}

async function main() {
  if (await checkConnection()) {
    await seedBasicData();
  }
}

main().catch(console.error);