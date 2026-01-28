-- ShareFile Database Schema
-- Run this SQL to initialize the database

-- Create the files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  download_count INTEGER DEFAULT 0,
  download_limit INTEGER DEFAULT NULL,  -- NULL means unlimited
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Create index for faster queries on creation date
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);

-- Create index for faster lookups by stored name
CREATE INDEX IF NOT EXISTS idx_files_stored_name ON files(stored_name);

-- Migration: Remove password_plain column if it exists (security improvement)
-- ALTER TABLE files DROP COLUMN IF EXISTS password_plain;
