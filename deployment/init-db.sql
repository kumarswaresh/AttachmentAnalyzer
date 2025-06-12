-- Initial database setup for AI Agent Platform
-- This script creates the necessary database and basic configuration

-- Create database if it doesn't exist (handled by Docker)
-- CREATE DATABASE aiagent;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create basic indexes for performance
-- These will be created by Drizzle migrations, but we include them for reference

-- Performance settings for the session
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Comment on the database
COMMENT ON DATABASE aiagent IS 'AI Agent Platform Database - Production Ready Multi-tenant System';