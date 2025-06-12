import { config } from "dotenv";
import pg from "pg";
import fs from "fs";

// Load environment variables
config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Read the schema SQL from the migrations directory or create it directly
const createTablesSQL = `
-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  "isActive" BOOLEAN DEFAULT true,
  "lastLogin" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "ownerId" INTEGER REFERENCES users(id),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "keyType" VARCHAR(100) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  "isRequired" BOOLEAN DEFAULT false,
  description TEXT,
  "userId" INTEGER REFERENCES users(id),
  "organizationId" INTEGER REFERENCES organizations(id),
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  "userId" INTEGER REFERENCES users(id),
  "organizationId" INTEGER REFERENCES organizations(id),
  config JSONB DEFAULT '{}',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "targetAudience" TEXT,
  budget DECIMAL(10,2),
  "startDate" TIMESTAMP,
  "endDate" TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft',
  "userId" INTEGER REFERENCES users(id),
  "organizationId" INTEGER REFERENCES organizations(id),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys("userId");
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents("userId");
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_user_id ON marketing_campaigns("userId");
`;

async function migrateDatabase() {
  try {
    console.log("🔄 Connecting to database...");
    await pool.query("SELECT 1");
    console.log("✅ Database connection successful");

    console.log("🔄 Running database migrations...");
    await pool.query(createTablesSQL);
    console.log("✅ Database schema created/updated successfully");

    // Check if we have any users
    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    console.log(`📊 Current user count: ${userCount.rows[0].count}`);

    await pool.end();
    console.log("✅ Database migration completed successfully");
  } catch (error) {
    console.error("❌ Database migration failed:", error.message);
    process.exit(1);
  }
}

migrateDatabase();