-- =============================================================================
-- PostgreSQL Initialization Script for Property Management Application
-- =============================================================================
-- This script runs automatically when the PostgreSQL container is first created
-- It sets up the database with proper extensions and initial configuration

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- For encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- For text search and similarity
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- For better indexing

-- Set timezone to UTC
SET timezone = 'UTC';

-- Create custom types (examples - adjust based on your schema)
DO $$ 
BEGIN
    -- Property status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status') THEN
        CREATE TYPE property_status AS ENUM ('active', 'inactive', 'maintenance', 'sold');
    END IF;
    
    -- Lease status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lease_status') THEN
        CREATE TYPE lease_status AS ENUM ('active', 'expired', 'terminated', 'pending');
    END IF;
    
    -- Transaction type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
    END IF;
    
    -- User role enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'property_manager', 'tenant', 'owner');
    END IF;
END$$;

-- Create a function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant necessary permissions
-- Note: The application will use the POSTGRES_USER specified in docker-compose.yml
-- Additional users can be created here if needed

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto, pg_trgm, btree_gin';
    RAISE NOTICE 'Custom types created: property_status, lease_status, transaction_type, user_role';
    RAISE NOTICE 'Timezone set to UTC';
END$$;

