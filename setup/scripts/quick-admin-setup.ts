/**
 * Quick Admin Setup Script
 * Creates basic admin user for local development
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createAdminUser() {
  // Parse DATABASE_URL and add SSL mode if needed
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Add SSL mode for RDS compatibility
  if (!databaseUrl.includes('sslmode=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl += separator + 'sslmode=disable';
  }

  const client = new Pool({
    connectionString: databaseUrl
  });

  try {
    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@local.dev']
    );

    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const userResult = await client.query(`
      INSERT INTO users (username, email, password, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email
    `, ['admin', 'admin@local.dev', hashedPassword, 'Super Admin', true]);

    console.log(`✅ Created admin user: ${userResult.rows[0].email}`);

  } catch (error) {
    console.error('Admin setup failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUser().catch(console.error);
}

export { createAdminUser };