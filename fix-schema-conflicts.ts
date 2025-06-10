#!/usr/bin/env tsx

/**
 * Schema Conflict Resolution Script
 * Handles foreign key constraint errors and type mismatches
 * Run this when encountering schema migration issues
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
const db = drizzle(pool);

async function fixSchemaConflicts() {
  console.log('🔧 Fixing schema conflicts and type mismatches...\n');
  
  try {
    // Step 1: Drop all foreign key constraints that might be causing issues
    console.log('📋 Step 1: Removing problematic foreign key constraints...');
    
    const dropConstraints = [
      'ALTER TABLE IF EXISTS deployments DROP CONSTRAINT IF EXISTS deployments_agent_id_agents_id_fk CASCADE;',
      'ALTER TABLE IF EXISTS deployments DROP CONSTRAINT IF EXISTS deployments_agent_app_id_agent_apps_id_fk CASCADE;',
      'ALTER TABLE IF EXISTS agent_credentials DROP CONSTRAINT IF EXISTS agent_credentials_agent_id_agents_id_fk CASCADE;',
      'ALTER TABLE IF EXISTS chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_agent_id_agents_id_fk CASCADE;',
      'ALTER TABLE IF EXISTS agent_logs DROP CONSTRAINT IF EXISTS agent_logs_agent_id_agents_id_fk CASCADE;',
      'ALTER TABLE IF EXISTS vector_cache DROP CONSTRAINT IF EXISTS vector_cache_agent_id_agents_id_fk CASCADE;',
      'ALTER TABLE IF EXISTS agent_memory DROP CONSTRAINT IF EXISTS agent_memory_agent_id_agents_id_fk CASCADE;',
      'ALTER TABLE IF EXISTS agent_response_schemas DROP CONSTRAINT IF EXISTS agent_response_schemas_agent_id_agents_id_fk CASCADE;',
      'ALTER TABLE IF EXISTS execution_logs DROP CONSTRAINT IF EXISTS execution_logs_agent_id_agents_id_fk CASCADE;',
    ];
    
    for (const constraint of dropConstraints) {
      try {
        await db.execute(sql.raw(constraint));
        console.log(`✓ Dropped constraint: ${constraint.split(' ')[6]}`);
      } catch (error) {
        console.log(`- Constraint not found: ${constraint.split(' ')[6]}`);
      }
    }
    
    // Step 2: Fix column types that don't match
    console.log('\n📋 Step 2: Fixing column type mismatches...');
    
    const typeFixQueries = [
      // Fix deployments table agent_id type
      `ALTER TABLE IF EXISTS deployments 
       ALTER COLUMN agent_id TYPE uuid USING agent_id::uuid;`,
      
      // Fix deployments table agent_app_id type  
      `ALTER TABLE IF EXISTS deployments 
       ALTER COLUMN agent_app_id TYPE uuid USING agent_app_id::uuid;`,
      
      // Fix agent_credentials table credential_id type
      `ALTER TABLE IF EXISTS agent_credentials 
       ALTER COLUMN credential_id TYPE integer USING credential_id::integer;`,
    ];
    
    for (const query of typeFixQueries) {
      try {
        await db.execute(sql.raw(query));
        console.log('✓ Fixed column type');
      } catch (error) {
        console.log(`- Column type fix not needed or failed: ${error.message}`);
      }
    }
    
    // Step 3: Clean up orphaned data that might prevent foreign key creation
    console.log('\n📋 Step 3: Cleaning orphaned data...');
    
    const cleanupQueries = [
      // Remove deployments with invalid agent references
      `DELETE FROM deployments WHERE agent_id IS NOT NULL 
       AND agent_id NOT IN (SELECT id FROM agents);`,
      
      // Remove deployments with invalid agent_app references
      `DELETE FROM deployments WHERE agent_app_id IS NOT NULL 
       AND agent_app_id NOT IN (SELECT id FROM agent_apps);`,
      
      // Remove agent_credentials with invalid agent references
      `DELETE FROM agent_credentials WHERE agent_id IS NOT NULL 
       AND agent_id NOT IN (SELECT id FROM agents);`,
      
      // Remove agent_credentials with invalid credential references
      `DELETE FROM agent_credentials WHERE credential_id IS NOT NULL 
       AND credential_id NOT IN (SELECT id FROM credentials);`,
    ];
    
    for (const query of cleanupQueries) {
      try {
        const result = await db.execute(sql.raw(query));
        console.log(`✓ Cleaned orphaned records`);
      } catch (error) {
        console.log(`- Cleanup not needed: ${error.message}`);
      }
    }
    
    console.log('\n✅ Schema conflict resolution completed');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run db:push');
    console.log('2. If still errors, run: npx tsx server/fresh-seed.ts');
    
  } catch (error) {
    console.error('❌ Error fixing schema conflicts:', error);
    console.log('\n🔧 Manual fix required:');
    console.log('1. Drop database: dropdb agent_platform');
    console.log('2. Create database: createdb agent_platform');
    console.log('3. Push schema: npm run db:push');
    console.log('4. Seed data: npx tsx server/fresh-seed.ts');
  } finally {
    await pool.end();
  }
}

// Run the fix
fixSchemaConflicts().catch(console.error);