/**
 * Demo Data Setup Script
 * Creates demo users and organization for testing
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

async function createDemoData() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Creating demo data...');

    // Check if demo organization already exists
    const existingOrg = await client.query(
      'SELECT id FROM organizations WHERE slug = $1',
      ['demo-org']
    );

    let orgId = 1; // Default to admin user
    if (existingOrg.rows.length === 0) {
      const orgResult = await client.query(`
        INSERT INTO organizations (name, slug, description, is_active, owner_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name
      `, ['Demo Organization', 'demo-org', 'A demo organization for testing', true, 1]);
      orgId = orgResult.rows[0].id;
      console.log(`Created organization: ${orgResult.rows[0].name}`);
    } else {
      orgId = existingOrg.rows[0].id;
      console.log('Demo organization already exists');
    }

    // Create demo users
    const demoUsers = [
      { username: 'superadmin', email: 'superadmin@agentplatform.com', password: 'admin123', role: 'Super Admin' },
      { username: 'demo', email: 'demo@agentplatform.com', password: 'demo123', role: 'Admin' }
    ];

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [userData.username]
      );

      if (existingUser.rows.length === 0) {
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create user
        const userResult = await client.query(`
          INSERT INTO users (username, email, password, role, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username
        `, [userData.username, userData.email, hashedPassword, userData.role, true]);

        console.log(`Created user: ${userResult.rows[0].username}`);
      } else {
        console.log(`User ${userData.username} already exists`);
      }
    }

    console.log('\n✅ Demo data setup complete!');
    console.log('\n🔑 Demo credentials:');
    console.log('   superadmin@agentplatform.com / admin123');
    console.log('   demo@agentplatform.com / demo123');
    console.log('   admin@local.dev / admin123');

  } catch (error) {
    console.error('Demo setup failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDemoData().catch(console.error);
}

export { createDemoData };