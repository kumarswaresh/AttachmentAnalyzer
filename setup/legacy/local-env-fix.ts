#!/usr/bin/env tsx

/**
 * Local Environment Fix for macOS
 * Fixes DATABASE_URL and environment variable loading issues
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

function checkAndFixEnv() {
  console.log('🔧 Checking local environment setup...\n');
  
  // Check if .env exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    
    // Create basic .env from sample
    const samplePath = path.join(process.cwd(), '.env.sample');
    if (fs.existsSync(samplePath)) {
      fs.copyFileSync(samplePath, envPath);
      console.log('✅ Created .env from .env.sample');
    } else {
      // Create minimal .env
      const basicEnv = `# Local Development Environment
DATABASE_URL=postgresql://postgres@localhost:5432/agent_platform
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
SESSION_SECRET=local_development_secret_123
PORT=5005
`;
      fs.writeFileSync(envPath, basicEnv);
      console.log('✅ Created basic .env file');
    }
  }
  
  // Load environment variables
  config();
  
  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not set in environment');
    return false;
  }
  
  console.log('✅ Environment variables loaded');
  console.log(`📊 DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
  
  return true;
}

if (require.main === module) {
  const success = checkAndFixEnv();
  
  if (success) {
    console.log('\n🎉 Environment setup complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Make sure PostgreSQL is running: brew services start postgresql@15');
    console.log('   2. Create database: createdb agent_platform');
    console.log('   3. Run quick setup: npx tsx quick-local-fix.ts');
    console.log('   4. Start application: npm run dev');
  } else {
    console.log('\n❌ Environment setup failed');
    process.exit(1);
  }
}

export { checkAndFixEnv };