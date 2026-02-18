-- Migration: Optimize compound indexes for common query patterns
-- Purpose: Reduce query latency for filtered + sorted searches
-- Created: 2026-02-18
-- Expected impact: 40-60% latency reduction for multi-filter queries

-- Composite index for TRL + popularity (common combo filter)
-- Benefit: Queries like "show me TRL-8 projects ranked by popularity" use single index scan
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_trl_popularity_composite
ON projects(trl ASC, popularity_score DESC NULLS LAST) 
WHERE trl IS NOT NULL;

-- Composite index for organization + recency (org-scoped + sorted)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_organization_recency
ON projects(organization ASC, last_updated DESC)
WHERE organization IS NOT NULL;

-- Composite index for technology_area + popularity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_tech_area_popularity
ON projects(technology_area ASC, popularity_score DESC NULLS LAST)
WHERE technology_area IS NOT NULL;

-- Covering index for full-text search (includes columns needed for result set)
-- Note: GIN indexes don't support INCLUDE in PostgreSQL, so we use a standard GIN index
-- PostgreSQL will perform a table scan for the additional columns but the GIN scan is efficient
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_fulltext_covering
ON projects USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Combined filter + sort index for status + recency (for feed generation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_recency
ON projects(status ASC, last_updated DESC)
WHERE status IS NOT NULL;

-- Partial index for active projects (status = 'Active')
-- Benefit: Fast queries on active projects, smaller index size
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_active
ON projects(popularity_score DESC NULLS LAST)
WHERE status = 'Active';

-- Comment on indexes for documentation
COMMENT ON INDEX idx_projects_trl_popularity_composite IS 'Composite for TRL + popularity queries, common filter combination';
COMMENT ON INDEX idx_projects_organization_recency IS 'Composite for org-scoped search + recency sorting';
COMMENT ON INDEX idx_projects_tech_area_popularity IS 'Composite for technology area + popularity filtering';
COMMENT ON INDEX idx_projects_fulltext_covering IS 'GIN index for full-text search (no covering support in PostgreSQL GIN)';
COMMENT ON INDEX idx_projects_status_recency IS 'Composite for status + recency, used in feed generation';
COMMENT ON INDEX idx_projects_active IS 'Partial index for active projects only (smaller, faster)';
