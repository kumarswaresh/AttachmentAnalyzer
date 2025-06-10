#!/usr/bin/env tsx

/**
 * Complete Fresh Setup Script
 * Runs the entire setup process from npm install through working application
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 AI Agent Platform - Complete Fresh Setup\n');

async function runCommand(command: string, description: string): Promise<boolean> {
  try {
    console.log(`📋 ${description}...`);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} failed: ${error.message}\n`);
    return false;
  }
}

async function runSetup() {
  // Step 1: Environment check
  console.log('📋 Step 1: Environment verification...');
  
  if (!existsSync('.env')) {
    console.log('❌ .env file not found');
    console.log('💡 Please copy .env.sample to .env and configure your settings\n');
    return;
  }
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not configured in .env');
    console.log('💡 Please set DATABASE_URL in your .env file\n');
    return;
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not configured in .env');
    console.log('💡 Please set OPENAI_API_KEY in your .env file\n');
    return;
  }
  
  console.log('✅ Environment configuration verified\n');
  
  // Step 2: Dependencies
  console.log('📋 Step 2: Installing dependencies...');
  if (!await runCommand('npm install', 'Installing npm dependencies')) {
    return;
  }
  
  // Step 3: Database schema
  console.log('📋 Step 3: Setting up database schema...');
  
  // Try standard migration first
  try {
    execSync('npx drizzle-kit generate', { stdio: 'pipe' });
    execSync('npx drizzle-kit migrate', { stdio: 'pipe' });
    console.log('✅ Database schema migration completed');
  } catch (error) {
    console.log('⚠️  Migration failed, trying schema push...');
    
    // Fallback to push with auto-accept
    try {
      execSync('echo "+" | npx drizzle-kit push', { stdio: 'pipe', timeout: 30000 });
      console.log('✅ Database schema push completed');
    } catch (pushError) {
      console.log('⚠️  Interactive push failed, trying force push...');
      
      // Last resort - direct SQL execution
      try {
        console.log('📋 Applying schema directly...');
        execSync('npx tsx server/db.ts', { stdio: 'inherit' });
        console.log('✅ Database schema applied directly');
      } catch (directError) {
        console.log('❌ All database setup methods failed');
        console.log('💡 Manual intervention required - see RUN_THE_APP.md for troubleshooting');
        return;
      }
    }
  }
  
  console.log('');
  
  // Step 4: Database seeding
  console.log('📋 Step 4: Seeding database with initial data...');
  
  const seedCommands = [
    { cmd: 'npx tsx server/seed-roles.ts', desc: 'Seeding system roles' },
    { cmd: 'npx tsx server/setup-demo-users.ts', desc: 'Creating demo users' },
    { cmd: 'npx tsx server/create-csharp-agent.ts', desc: 'Setting up C# agent' }
  ];
  
  for (const { cmd, desc } of seedCommands) {
    if (!await runCommand(cmd, desc)) {
      console.log('⚠️  Continuing with remaining setup steps...\n');
    }
  }
  
  // Step 5: Application start
  console.log('📋 Step 5: Starting application...');
  console.log('🎯 Application will start on http://localhost:5000');
  console.log('');
  console.log('📝 Default Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('');
  console.log('🔧 Alternative credentials:');
  console.log('   Developer - dev/dev123');
  console.log('   User - user/user123');
  console.log('');
  console.log('🚀 Starting server...\n');
  
  try {
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Server failed to start');
    console.log('💡 Check the logs above for specific error details');
    console.log('💡 Common issues: Port 5000 in use, database connectivity, missing API keys');
  }
}

// Check if required tools are available
try {
  execSync('npx --version', { stdio: 'pipe' });
  execSync('node --version', { stdio: 'pipe' });
} catch (error) {
  console.log('❌ Node.js and npm are required but not found');
  console.log('💡 Please install Node.js 18+ and npm');
  process.exit(1);
}

// Load environment variables
if (existsSync('.env')) {
  require('dotenv').config();
}

runSetup().catch(console.error);