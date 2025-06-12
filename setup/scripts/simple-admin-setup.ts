/**
 * Simple Admin Setup Script
 * Creates admin user using the existing database connection
 */

import { db } from '../../server/db.js';
import { users } from '../../shared/schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function createSimpleAdminUser() {
  try {
    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, 'admin@local.dev'))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const newUser = await db.insert(users).values({
      username: 'admin',
      email: 'admin@local.dev',
      password: hashedPassword,
      role: 'Super Admin',
      isActive: true
    }).returning();

    console.log(`✅ Created admin user: ${newUser[0].email}`);
    console.log('Login credentials:');
    console.log('Email: admin@local.dev');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Admin setup failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSimpleAdminUser().catch(console.error);
}

export { createSimpleAdminUser };