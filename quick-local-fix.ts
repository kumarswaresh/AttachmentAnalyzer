#!/usr/bin/env tsx

/**
 * Quick Local Fix for macOS PostgreSQL Setup
 * Creates basic data to get your application running
 */

import { config } from 'dotenv';
config();

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false 
});

async function quickSetup() {
  console.log('🔧 Quick local setup for macOS...\n');
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected');

    // Create basic admin user using raw SQL (bypasses schema issues)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Insert basic role
    await pool.query(`
      INSERT INTO roles (name, description, is_system_role, permissions, feature_access, resource_limits, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `, [
      'Super Admin',
      'Full system access',
      true,
      JSON.stringify(['*']),
      JSON.stringify({
        canCreateUsers: true,
        canManageRoles: true,
        canAccessBilling: true
      }),
      null
    ]);
    console.log('✅ Created Super Admin role');

    // Insert organization
    await pool.query(`
      INSERT INTO organizations (name, description, settings, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [
      'Local Organization',
      'Default organization for local development',
      JSON.stringify({ maxAgents: 100, maxUsers: 50 }),
      true
    ]);
    console.log('✅ Created organization');

    // Insert admin user
    await pool.query(`
      INSERT INTO users (username, email, password, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (username) DO NOTHING
    `, [
      'admin',
      'admin@local.dev',
      hashedPassword,
      'Super Admin',
      true
    ]);
    console.log('✅ Created admin user');

    console.log('\n🎉 Setup complete!');
    console.log('\n🔑 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n🚀 Start your app: npm run dev');
    console.log('📱 Access at: http://localhost:5005');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('\n💡 Try running database schema setup first:');
      console.log('   npx drizzle-kit push');
    }
  } finally {
    await pool.end();
  }
}

quickSetup();