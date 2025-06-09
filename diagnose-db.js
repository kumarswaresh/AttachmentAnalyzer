#!/usr/bin/env node

/**
 * Database Diagnostic Script
 * Helps identify PostgreSQL permission and connection issues
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 AI Agent Platform - Database Diagnostic\n');

// Check if .env exists
if (fs.existsSync('.env')) {
  console.log('✓ Found .env file');
  
  // Load environment variables
  require('dotenv').config();
  
  if (process.env.DATABASE_URL) {
    console.log('✓ DATABASE_URL found in .env');
    
    // Parse DATABASE_URL
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log(`📋 Database Connection Details:
   Host: ${url.hostname}
   Port: ${url.port || '5432'}
   Database: ${url.pathname.slice(1)}
   Username: ${url.username}
   Password: ${url.password ? '[SET]' : '[NOT SET]'}\n`);
      
      // Test basic connection
      console.log('🔌 Testing database connection...');
      try {
        execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT version();" 2>/dev/null`, { stdio: 'pipe' });
        console.log('✓ Database connection successful\n');
        
        // Check user permissions
        console.log('🔐 Checking user permissions...');
        try {
          const userCheck = execSync(`psql "${process.env.DATABASE_URL}" -t -c "SELECT current_user, session_user;"`, { encoding: 'utf8' });
          console.log(`Current user: ${userCheck.trim()}`);
          
          // Check schema permissions
          try {
            execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT 1;" 2>/dev/null`, { stdio: 'pipe' });
            console.log('✓ Basic query permissions working');
            
            // Check if user can create tables
            try {
              execSync(`psql "${process.env.DATABASE_URL}" -c "CREATE TABLE IF NOT EXISTS diagnostic_test (id SERIAL PRIMARY KEY); DROP TABLE IF EXISTS diagnostic_test;" 2>/dev/null`, { stdio: 'pipe' });
              console.log('✓ Table creation permissions working');
            } catch (error) {
              console.log('❌ Cannot create tables - permission denied');
              console.log('\n🔧 SOLUTION NEEDED: Grant table creation permissions');
              console.log(`Run this as PostgreSQL superuser:
   psql -U postgres -d ${url.pathname.slice(1)}
   GRANT ALL PRIVILEGES ON SCHEMA public TO ${url.username};
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${url.username};
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${url.username};`);
            }
          } catch (error) {
            console.log('❌ Basic schema access denied');
          }
        } catch (error) {
          console.log('❌ Cannot check user permissions');
        }
        
      } catch (error) {
        console.log('❌ Database connection failed');
        console.log('\n🔧 Possible solutions:');
        console.log('1. Check if PostgreSQL is running: pg_isready');
        console.log('2. Verify DATABASE_URL format');
        console.log('3. Check username/password credentials');
      }
      
    } catch (error) {
      console.log('❌ Invalid DATABASE_URL format');
      console.log('Expected format: postgresql://username:password@host:port/database');
    }
  } else {
    console.log('❌ DATABASE_URL not found in .env');
  }
} else {
  console.log('❌ .env file not found - copy .env.sample to .env');
}

// Check for common macOS PostgreSQL setups
console.log('\n🍎 macOS PostgreSQL Quick Checks:');

try {
  const username = execSync('whoami', { encoding: 'utf8' }).trim();
  console.log(`Current macOS user: ${username}`);
  
  // Check if Homebrew PostgreSQL
  try {
    execSync('brew list postgresql 2>/dev/null', { stdio: 'pipe' });
    console.log('✓ Homebrew PostgreSQL detected');
    console.log(`\n💡 Try this DATABASE_URL for Homebrew setup:
   DATABASE_URL="postgresql://${username}:@localhost:5432/agent_platform"`);
  } catch (error) {
    console.log('- Homebrew PostgreSQL not detected');
  }
  
  // Check if user can create database
  try {
    execSync(`createdb diagnostic_test_${Date.now()} 2>/dev/null`, { stdio: 'pipe' });
    console.log('✓ Can create databases with current user');
  } catch (error) {
    console.log('❌ Cannot create databases - may need postgres user');
  }
  
} catch (error) {
  console.log('❌ Cannot determine current user');
}

console.log('\n📚 Quick Reference Commands:');
console.log('# Check PostgreSQL status');
console.log('pg_isready');
console.log('');
console.log('# Connect as superuser');
console.log('psql -U postgres');
console.log('');
console.log('# Grant permissions (run as postgres user)');
console.log('GRANT ALL PRIVILEGES ON SCHEMA public TO your_username;');
console.log('');
console.log('# Create database with current user as owner');
console.log('createdb agent_platform');