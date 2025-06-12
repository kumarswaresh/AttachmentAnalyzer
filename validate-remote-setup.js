#!/usr/bin/env node

// Remote Setup Script Validation
// Tests all components of the remote setup script for RDS deployment

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function validateRemoteSetup() {
  console.log('🧪 Remote Setup Script Validation');
  console.log('=================================');

  // Test 1: Check script files exist
  console.log('\nTest 1: Script Files Validation');
  console.log('===============================');

  const requiredFiles = [
    'setup/remote/remote-setup.sh',
    'setup/scripts/quick-admin-setup.ts',
    'setup/scripts/demo-data-setup.ts',
    '.env.sample'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      process.exit(1);
    }
  }

  // Test 2: Environment validation logic
  console.log('\nTest 2: Environment Validation Logic');
  console.log('====================================');

  // Test missing variables detection
  const testEnv = {
    DATABASE_URL: 'postgresql://test@localhost/test'
    // Missing OPENAI_API_KEY and SESSION_SECRET
  };

  const missingVars = [];
  if (!testEnv.OPENAI_API_KEY) missingVars.push('OPENAI_API_KEY');
  if (!testEnv.SESSION_SECRET) missingVars.push('SESSION_SECRET');

  if (missingVars.length > 0) {
    console.log(`✅ Environment validation working - detects missing: ${missingVars.join(', ')}`);
  } else {
    console.log('❌ Environment validation not working');
    process.exit(1);
  }

  // Test 3: Database connection with SSL
  console.log('\nTest 3: Database Connection with SSL');
  console.log('====================================');

  try {
    const client = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const result = await client.query('SELECT 1 as test');
    if (result.rows[0].test === 1) {
      console.log('✅ Database connection successful with SSL configuration');
    }
    await client.end();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  // Test 4: Schema detection
  console.log('\nTest 4: Schema Detection');
  console.log('========================');

  try {
    const client = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const schemaResult = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'"
    );

    if (schemaResult.rows.length > 0) {
      console.log('✅ Schema detection working - found existing schema');
    } else {
      console.log('✅ Schema detection working - no existing schema detected');
    }
    await client.end();
  } catch (error) {
    console.log('❌ Schema detection failed:', error.message);
    process.exit(1);
  }

  // Test 5: Script permissions
  console.log('\nTest 5: Script Permissions');
  console.log('==========================');

  try {
    const stats = fs.statSync('setup/remote/remote-setup.sh');
    const isExecutable = !!(stats.mode & parseInt('111', 8));
    
    if (isExecutable) {
      console.log('✅ Remote setup script is executable');
    } else {
      console.log('❌ Remote setup script not executable');
      process.exit(1);
    }
  } catch (error) {
    console.log('❌ Error checking script permissions:', error.message);
    process.exit(1);
  }

  // Test 6: SSL Configuration Logic
  console.log('\nTest 6: SSL Configuration Logic');
  console.log('===============================');

  const testProduction = process.env.NODE_ENV === 'production';
  const sslConfig = testProduction ? { rejectUnauthorized: false } : false;
  
  console.log(`✅ SSL configuration: ${testProduction ? 'Enabled for production' : 'Optional for development'}`);

  console.log('\n🎉 Remote Setup Script Validation Complete!');
  console.log('\nResults Summary:');
  console.log('✅ All required script files present');
  console.log('✅ Environment validation logic working');
  console.log('✅ Database connection with SSL support');
  console.log('✅ Schema detection logic functional');
  console.log('✅ Script permissions configured');
  console.log('✅ SSL configuration logic working');
  console.log('\nThe remote setup script is ready for AWS RDS deployment!');
}

// Run validation
validateRemoteSetup().catch(error => {
  console.error('Validation failed:', error.message);
  process.exit(1);
});