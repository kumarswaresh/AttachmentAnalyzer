import { db } from './db';
import { sql } from 'drizzle-orm';
import { 
  agents, 
  agentMessages, 
  agentChains, 
  chainExecutions, 
  users, 
  roles, 
  organizations, 
  credentials, 
  agentTemplates,
  customModels
} from '../shared/schema';

/**
 * Database Reset Script
 * WARNING: This will delete ALL data from the database
 * Use with caution - only for development/testing
 */

async function resetDatabase() {
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log('Starting database reset in 3 seconds...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    console.log('🗑️  Clearing all data in correct dependency order...');

    // Delete data from tables in correct dependency order (child tables first)
    await db.delete(chainExecutions);
    console.log('✓ Cleared chain executions');
    
    await db.delete(agentChains);
    console.log('✓ Cleared agent chains');
    
    await db.delete(agentMessages);
    console.log('✓ Cleared agent messages');
    
    // Clear all tables that reference agents
    try {
      await db.execute(sql`DELETE FROM agent_logs WHERE agent_id IS NOT NULL;`);
      console.log('✓ Cleared agent logs');
    } catch (error) {
      console.log('- No agent logs to clear');
    }
    
    try {
      await db.execute(sql`DELETE FROM chat_sessions WHERE agent_id IS NOT NULL;`);
      console.log('✓ Cleared chat sessions');
    } catch (error) {
      console.log('- No chat sessions to clear');
    }
    
    try {
      await db.execute(sql`DELETE FROM agent_memory WHERE agent_id IS NOT NULL;`);
      console.log('✓ Cleared agent memory');
    } catch (error) {
      console.log('- No agent memory to clear');
    }
    
    await db.delete(agents);
    console.log('✓ Cleared agents');
    
    await db.delete(agentTemplates);
    console.log('✓ Cleared agent templates');
    
    await db.delete(customModels);
    console.log('✓ Cleared custom models');
    
    await db.delete(credentials);
    console.log('✓ Cleared credentials');
    
    // Clear user sessions before deleting users
    try {
      await db.execute(sql`DELETE FROM user_sessions WHERE user_id IS NOT NULL;`);
      console.log('✓ Cleared user sessions');
    } catch (error) {
      console.log('- No user sessions to clear');
    }
    
    await db.delete(users);
    console.log('✓ Cleared users');
    
    await db.delete(organizations);
    console.log('✓ Cleared organizations');
    
    await db.delete(roles);
    console.log('✓ Cleared roles');

    // Reset sequences
    await db.execute(sql`
      DO $$ 
      DECLARE 
        seq_name TEXT;
      BEGIN 
        FOR seq_name IN 
          SELECT sequence_name 
          FROM information_schema.sequences 
          WHERE sequence_schema = 'public'
        LOOP 
          EXECUTE 'ALTER SEQUENCE ' || seq_name || ' RESTART WITH 1';
        END LOOP;
      END $$;
    `);
    console.log('✓ Reset all sequences');

    console.log('✅ Database reset completed successfully!');
    console.log('💡 Run the seeding scripts to populate with fresh data');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Run reset if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Reset failed:', error);
      process.exit(1);
    });
}

export { resetDatabase };