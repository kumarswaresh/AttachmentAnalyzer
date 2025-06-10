import { resetDatabase } from './reset-database';

/**
 * Fresh Seed Script
 * Resets database and runs all seeding scripts
 */

async function runFreshSeed() {
  console.log('🌱 Starting fresh seed process...');
  
  try {
    // Step 1: Reset database
    console.log('\n📋 Step 1: Resetting database...');
    await resetDatabase();
    
    // Step 2: Seed roles
    console.log('\n📋 Step 2: Seeding roles...');
    const { seedRoles } = await import('./seed-roles');
    await seedRoles();
    
    // Step 3: Setup demo users
    console.log('\n📋 Step 3: Setting up demo users...');
    const { setupDemoUsers } = await import('./setup-demo-users');
    await setupDemoUsers();
    
    // Step 4: Create C# agent
    console.log('\n📋 Step 4: Creating C# Enterprise Developer agent...');
    const { createCSharpCodingAgent } = await import('./create-csharp-agent');
    await createCSharpCodingAgent();
    
    console.log('\n✅ Fresh seed completed successfully!');
    console.log('\n🎯 Ready to use:');
    console.log('   - Admin login: admin / admin123');
    console.log('   - Developer login: developer / dev123');
    console.log('   - C# Enterprise Developer agent available');
    console.log('   - All roles and permissions configured');
    
  } catch (error) {
    console.error('❌ Fresh seed failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFreshSeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fresh seed failed:', error);
      process.exit(1);
    });
}

export { runFreshSeed };