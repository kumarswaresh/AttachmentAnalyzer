#!/usr/bin/env tsx

/**
 * Local Environment Fix for macOS
 * Fixes DATABASE_URL and environment variable loading issues
 */

import { config } from 'dotenv';
import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load existing .env
config();

function checkAndFixEnv() {
  console.log('🔧 Fixing local environment configuration...\n');
  
  // Check if .env exists
  if (!existsSync('.env')) {
    console.log('Creating .env from .env.sample...');
    execSync('cp .env.sample .env');
  }
  
  // Get current user for database URL
  const currentUser = process.env.USER || process.env.USERNAME || 'postgres';
  const dbName = 'agent_platform';
  
  // Read current .env content
  let envContent = '';
  try {
    envContent = require('fs').readFileSync('.env', 'utf8');
  } catch (error) {
    console.log('Error reading .env file');
    return;
  }
  
  // Fix DATABASE_URL if needed
  if (!envContent.includes('postgresql://') || envContent.includes('username:password@localhost')) {
    const correctDbUrl = `postgresql://${currentUser}@localhost:5432/${dbName}`;
    
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL=${correctDbUrl}`
      );
    } else {
      envContent = `DATABASE_URL=${correctDbUrl}\n` + envContent;
    }
    
    writeFileSync('.env', envContent);
    console.log(`✅ Fixed DATABASE_URL: ${correctDbUrl}`);
  }
  
  // Reload environment variables
  config({ override: true });
  
  // Verify database connection
  try {
    execSync(`psql "${process.env.DATABASE_URL}" -c "SELECT 1;" > /dev/null 2>&1`);
    console.log('✅ Database connection verified');
  } catch (error) {
    console.log('⚠️  Database connection failed. Creating database...');
    try {
      execSync(`createdb ${dbName}`);
      console.log(`✅ Database '${dbName}' created`);
    } catch (createError) {
      console.log(`❌ Failed to create database. Please run: createdb ${dbName}`);
    }
  }
  
  // Check OPENAI_API_KEY
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-openai-api-key')) {
    console.log('⚠️  OPENAI_API_KEY not configured');
    console.log('   Please add your OpenAI API key to .env file');
    console.log('   Get your key from: https://platform.openai.com/api-keys');
  } else {
    console.log('✅ OPENAI_API_KEY configured');
  }
  
  console.log('\n🎯 Environment setup complete!');
  console.log('Now you can run: npx tsx server/seed-roles.ts');
}

checkAndFixEnv();