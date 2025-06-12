import { config } from 'dotenv';
config();

import { Pool } from 'pg';

// Use regular pg Pool for EC2/server environments to avoid SSL issues
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false  // Disable SSL for local/EC2 connections
});

async function validateSetup() {
  console.log('🔍 Validating platform setup...\n');
  
  try {
    // Check roles table
    const rolesResult = await pool.query('SELECT COUNT(*) as count, string_agg(name, \', \') as roles FROM roles');
    const roleCount = rolesResult.rows[0].count;
    const roleNames = rolesResult.rows[0].roles;
    
    console.log(`✅ Roles Table: ${roleCount} roles found`);
    console.log(`   Available roles: ${roleNames}`);
    
    // Check users table
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = usersResult.rows[0].count;
    console.log(`✅ Users Table: ${userCount} users found`);
    
    // Check organizations table
    const orgsResult = await pool.query('SELECT COUNT(*) as count FROM organizations');
    const orgCount = orgsResult.rows[0].count;
    console.log(`✅ Organizations Table: ${orgCount} organizations found`);
    
    // Check admin users
    const adminResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role IN ('Super Admin', 'SuperAdmin', 'admin')
    `);
    const adminCount = adminResult.rows[0].count;
    console.log(`✅ Admin Users: ${adminCount} administrators found`);
    
    // Check sample organizations with specific names
    const sampleOrgsResult = await pool.query(`
      SELECT name 
      FROM organizations 
      WHERE name IN ('TechCorp Solutions', 'Digital Marketing Pro', 'FinanceWise Inc', 'HealthTech Innovations', 'EduLearn Platform')
      ORDER BY name
    `);
    
    if (sampleOrgsResult.rows.length > 0) {
      console.log(`✅ Demo Organizations: ${sampleOrgsResult.rows.length} client organizations found`);
      sampleOrgsResult.rows.forEach(org => {
        console.log(`   - ${org.name}`);
      });
    }
    
    // Check agents table if exists
    try {
      const agentsResult = await pool.query('SELECT COUNT(*) as count FROM agents');
      const agentCount = agentsResult.rows[0].count;
      console.log(`✅ Agents Table: ${agentCount} agents found`);
    } catch (error) {
      console.log(`ℹ️  Agents Table: Not yet populated or doesn't exist`);
    }
    
    // Check agent_apps table if exists
    try {
      const appsResult = await pool.query('SELECT COUNT(*) as count FROM agent_apps');
      const appCount = appsResult.rows[0].count;
      console.log(`✅ Agent Apps Table: ${appCount} apps found`);
    } catch (error) {
      console.log(`ℹ️  Agent Apps Table: Not yet populated or doesn't exist`);
    }
    
    console.log('\n📊 Setup Validation Summary:');
    console.log(`   Total Roles: ${roleCount}`);
    console.log(`   Total Users: ${userCount}`);
    console.log(`   Total Organizations: ${orgCount}`);
    console.log(`   Admin Users: ${adminCount}`);
    
    if (roleCount >= 6 && userCount > 0 && orgCount > 0 && adminCount > 0) {
      console.log('\n🎉 Platform setup is complete and ready for use!');
      
      console.log('\n🔐 Demo Credentials Available:');
      console.log('   - superadmin@agentplatform.com / admin123');
      console.log('   - demo@agentplatform.com / demo123');
      console.log('   - admin@local.dev / admin123');
      
      console.log('\n🚀 Next Steps:');
      console.log('   1. Run "npm run dev" to start the development server');
      console.log('   2. Access the application at http://localhost:3000');
      console.log('   3. Log in with any of the demo credentials above');
      console.log('   4. Explore the role-based access controls and multi-tenant features');
    } else {
      console.log('\n⚠️  Setup appears incomplete. Consider running setup scripts again.');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run validation
validateSetup().then(() => {
  console.log('\nValidation completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});

export { validateSetup };