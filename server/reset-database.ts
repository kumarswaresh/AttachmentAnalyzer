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
    console.log('🗑️  Clearing all data with proper foreign key handling...');

    // Disable foreign key checks temporarily
    await db.execute(sql`SET session_replication_role = replica;`);
    
    // Delete data from tables (handling foreign key dependencies)
    await db.delete(chainExecutions);
    console.log('✓ Cleared chain executions');
    
    await db.delete(agentChains);
    console.log('✓ Cleared agent chains');
    
    await db.delete(agentMessages);
    console.log('✓ Cleared agent messages');
    
    // Clear agent logs first (referenced by agents)
    await db.execute(sql`DELETE FROM agent_logs;`);
    console.log('✓ Cleared agent logs');
    
    await db.delete(agents);
    console.log('✓ Cleared agents');
    
    await db.delete(agentTemplates);
    console.log('✓ Cleared agent templates');
    
    await db.delete(customModels);
    console.log('✓ Cleared custom models');
    
    await db.delete(credentials);
    console.log('✓ Cleared credentials');
    
    await db.delete(users);
    console.log('✓ Cleared users');
    
    await db.delete(organizations);
    console.log('✓ Cleared organizations');
    
    await db.delete(roles);
    console.log('✓ Cleared roles');

    // Re-enable foreign key checks
    await db.execute(sql`SET session_replication_role = DEFAULT;`);

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