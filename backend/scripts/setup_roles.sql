-- ==============================================================================
-- PostgreSQL Production Role Separation & Least-Privilege Script
-- ==============================================================================
-- Purpose:
-- Establishes a defense-in-depth permission model separating the DDL/Schema
-- migration owner from the unprivileged runtime application role.
--
-- Instructions:
-- 1. Execute this script using a PostgreSQL Superuser or Database Owner session
--    (e.g., via the Neon SQL Console or psql).
-- 2. Substitute 'STRONG_RUNTIME_PASSWORD_HERE' with a secure random secret.
-- 3. Configure Render's DATABASE_URL with the attendance_runtime user credentials.
-- ==============================================================================

-- 1. Create dedicated least-privilege application runtime role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'attendance_runtime') THEN
        CREATE ROLE attendance_runtime WITH LOGIN PASSWORD 'STRONG_RUNTIME_PASSWORD_HERE' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
END
$$;

-- 2. Revoke default public schema permissions to prevent unauthorized object creation
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 3. Grant schema usage to runtime role
GRANT USAGE ON SCHEMA public TO attendance_runtime;

-- 4. Grant strictly necessary Data Manipulation Language (DML) privileges on existing tables
-- Note: No DDL permissions (CREATE, ALTER, DROP, TRUNCATE) are granted to runtime role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO attendance_runtime;

-- 5. Grant sequence privileges needed for auto-incrementing surrogate keys (id)
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO attendance_runtime;

-- 6. Set default privileges so future tables created by the migration owner inherit least-privilege DML grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO attendance_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO attendance_runtime;

-- ==============================================================================
-- Verification Query:
-- Run to confirm runtime role has NO table-creation or superuser capabilities
-- ==============================================================================
-- SELECT rolname, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = 'attendance_runtime';
-- Expected result: rolsuper=false, rolcreaterole=false, rolcreatedb=false.
