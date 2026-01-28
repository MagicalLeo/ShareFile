#!/bin/bash

# ShareFile Database Setup Script
# Run this script to create the database and tables

# Configuration - modify these values or set environment variables
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-54321}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-sharefile}

echo "ShareFile Database Setup"
echo "========================"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"
echo "Database: $DB_NAME"
echo ""

# Create database (will prompt for password)
echo "Creating database '$DB_NAME'..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database may already exist, continuing..."

# Run schema
echo "Creating tables..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$(dirname "$0")/../server/database/schema.sql"

echo ""
echo "Setup complete!"
