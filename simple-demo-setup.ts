/**
 * Simple Demo Setup Script
 * Creates basic demo data without complex schema requirements
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function createSimpleDemoData() {
  const client = await pool.connect();
  
  try {
    console.log('Creating simple demo data...');

    // Create a basic organization with minimal fields
    const orgResult = await client.query(`
      INSERT INTO organizations (name, slug, description, is_active, owner_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `, ['Demo Organization', 'demo-org', 'A demo organization for testing', true, 1]);

    if (orgResult.rows.length > 0) {
      console.log(`Created organization: ${orgResult.rows[0].name}`);
    } else {
      console.log('Demo organization already exists');
    }

    // Create demo users with basic fields only
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const demoUsers = [
      { username: 'demo-user', email: 'demo@example.com', password: hashedPassword },
      { username: 'test-user', email: 'test@example.com', password: hashedPassword }
    ];

    for (const user of demoUsers) {
      const userResult = await client.query(`
        INSERT INTO users (username, email, password, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO NOTHING
        RETURNING id, username
      `, [user.username, user.email, user.password, 'user', true]);

      if (userResult.rows.length > 0) {
        console.log(`Created user: ${userResult.rows[0].username}`);
      } else {
        console.log(`User ${user.username} already exists`);
      }
    }

    console.log('\n✅ Simple demo setup complete!');
    console.log('\n🔑 Demo credentials:');
    console.log('   demo-user / demo123');
    console.log('   test-user / demo123');
    console.log('   admin / admin123');

  } catch (error) {
    console.error('Error creating demo data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
createSimpleDemoData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Demo setup failed:', error);
    process.exit(1);
  });

export { createSimpleDemoData };