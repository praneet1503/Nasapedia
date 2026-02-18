-- Migration: Add pgvector support and embeddings column
-- Purpose: Enable semantic/meaning-based search using embeddings
-- Created: 2026-02-18
-- Prerequisites: pgvector extension must be installed on Neon

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to projects table (384-dimensional vectors for all-MiniLM-L6-v2 model)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Add index on embeddings for efficient similarity search
-- Using HNSW index (Hierarchical Navigable Small World) for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_projects_embedding_hnsw
ON projects USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Track when embeddings were last updated
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP DEFAULT NULL;

-- Add column to track embedding version (for future model updates)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(255) DEFAULT 'all-MiniLM-L6-v2-v1' NULL;

-- Comment for documentation
COMMENT ON COLUMN projects.embedding IS '384-dimensional embedding vector for semantic search using all-MiniLM-L6-v2 model';
COMMENT ON COLUMN projects.embedding_updated_at IS 'Timestamp of when embedding was last generated';
COMMENT ON COLUMN projects.embedding_model IS 'Model version used to generate the embedding';
COMMENT ON INDEX idx_projects_embedding_hnsw IS 'HNSW index for fast semantic similarity search (<1ms for 5k projects)';
