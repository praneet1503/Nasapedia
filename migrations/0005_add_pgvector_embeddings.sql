CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding vector(384);

CREATE INDEX IF NOT EXISTS idx_projects_embedding_hnsw
ON projects USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP DEFAULT NULL;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(255) DEFAULT 'all-MiniLM-L6-v2-v1' NULL;

COMMENT ON COLUMN projects.embedding IS '384-dimensional embedding vector for semantic search using all-MiniLM-L6-v2 model';
COMMENT ON COLUMN projects.embedding_updated_at IS 'Timestamp of when embedding was last generated';
COMMENT ON COLUMN projects.embedding_model IS 'Model version used to generate the embedding';
COMMENT ON INDEX idx_projects_embedding_hnsw IS 'HNSW index for fast semantic similarity search (<1ms for 5k projects)';
