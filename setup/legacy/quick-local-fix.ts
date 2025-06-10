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
    
    // Check if admin user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    
    if (existingUser.rows.length === 0) {
      // Insert admin user directly
      await pool.query(`
        INSERT INTO users (username, email, password, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [
        'admin',
        'admin@local.dev',
        hashedPassword,
        'Super Admin',
        true
      ]);
      console.log('✅ Created admin user');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

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