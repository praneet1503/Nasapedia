-- Migration: Add performance indexes for fast search
-- Purpose: Optimize full-text search and common filter queries
-- Created: 2026-02-18

-- GIN index for full-text search on title + description
-- Dramatically speeds up tsvector @ plainto_tsquery searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_fulltext
ON projects USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Single-column indexes for common filter operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_trl
ON projects(trl) WHERE trl IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_organization
ON projects(organization) WHERE organization IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_technology_area
ON projects(technology_area) WHERE technology_area IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status
ON projects(status) WHERE status IS NOT NULL;

-- Composite index for common filter + sort combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_popularity
ON projects(popularity_score DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_last_updated
ON projects(last_updated DESC);

-- Composite index for TRL + popularity (common combo filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_trl_popularity
ON projects(trl, popularity_score DESC NULLS LAST);

-- Comment for documentation
COMMENT ON INDEX idx_projects_fulltext IS 'GIN index for full-text search performance on title + description';
COMMENT ON INDEX idx_projects_trl IS 'Speed up TRL range filters (trl_min, trl_max)';
COMMENT ON INDEX idx_projects_organization IS 'Speed up organization exact match filters';
COMMENT ON INDEX idx_projects_technology_area IS 'Speed up technology area exact match filters';
