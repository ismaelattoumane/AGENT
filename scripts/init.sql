-- Multi-Agent System DB Init
-- TypeORM will handle table creation via synchronize or migrations
-- This file handles extensions and initial data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Full text search indexes will be added by migrations
