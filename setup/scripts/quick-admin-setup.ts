/**
 * Quick Admin Setup Script
 * Creates basic admin user for local development
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const userResult = await client.query(`
      INSERT INTO users (username, email, password, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username
    `, ['admin', 'admin@example.com', hashedPassword, 'admin', true]);

    console.log(`✅ Created admin user: ${userResult.rows[0].username}`);

  } catch (error) {
    console.error('Admin setup failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser().catch(console.error);
}

export { createAdminUser };