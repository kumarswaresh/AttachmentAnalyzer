import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load environment variables from .env file
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  console.error("Available environment variables:", Object.keys(process.env).filter(key => key.includes('DATABASE')));
  throw new Error("DATABASE_URL must be set. Please check your .env file or environment variables.");
}

console.log("Using DATABASE_URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts", 
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  },
});