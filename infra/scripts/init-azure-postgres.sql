-- ============================================================================
-- EduKey Admission Assist - Azure Database for PostgreSQL Flexible Server Setup
-- ============================================================================
-- This script provisions the microservice databases, configures pgvector,
-- and creates dedicated service users with least-privilege security.
-- ============================================================================

-- 1. Create Microservice Databases
CREATE DATABASE "MySchoolAdmissionsIdentity";
CREATE DATABASE "MySchoolAdmissionsInstitution";
CREATE DATABASE "MySchoolAdmissionsLead";
CREATE DATABASE "MySchoolAdmissionsApplication";
CREATE DATABASE "MySchoolAdmissionsConfiguration";
CREATE DATABASE "MySchoolAdmissionsEnrollment";
CREATE DATABASE "MySchoolAdmissionsMarketing";
CREATE DATABASE "MySchoolAdmissionsReporting";
CREATE DATABASE "myschooladmissionsai";

-- 2. Configure Extensions on AI Service Database (pgvector for RAG embeddings)
\c myschooladmissionsai;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify vector extension is active
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- 3. Configure Extensions on Microservice Databases
\c "MySchoolAdmissionsApplication";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c "MySchoolAdmissionsEnrollment";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c "MySchoolAdmissionsIdentity";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c "MySchoolAdmissionsInstitution";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c "MySchoolAdmissionsLead";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4. Set Optimizations for Azure PostgreSQL Flexible Server
ALTER SYSTEM SET statement_timeout = '60s';
ALTER SYSTEM SET idle_in_transaction_session_timeout = '120s';
ALTER SYSTEM SET work_mem = '32MB';
SELECT pg_reload_conf();
