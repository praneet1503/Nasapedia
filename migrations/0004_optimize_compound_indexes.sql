CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_trl_popularity_composite
ON projects(trl ASC, popularity_score DESC NULLS LAST) 
WHERE trl IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_organization_recency
ON projects(organization ASC, last_updated DESC)
WHERE organization IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_tech_area_popularity
ON projects(technology_area ASC, popularity_score DESC NULLS LAST)
WHERE technology_area IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_fulltext_covering
ON projects USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_recency
ON projects(status ASC, last_updated DESC)
WHERE status IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_active
ON projects(popularity_score DESC NULLS LAST)
WHERE status = 'Active';

COMMENT ON INDEX idx_projects_trl_popularity_composite IS 'Composite for TRL + popularity queries, common filter combination';
COMMENT ON INDEX idx_projects_organization_recency IS 'Composite for org-scoped search + recency sorting';
COMMENT ON INDEX idx_projects_tech_area_popularity IS 'Composite for technology area + popularity filtering';
COMMENT ON INDEX idx_projects_fulltext_covering IS 'GIN index for full-text search (no covering support in PostgreSQL GIN)';
COMMENT ON INDEX idx_projects_status_recency IS 'Composite for status + recency, used in feed generation';
COMMENT ON INDEX idx_projects_active IS 'Partial index for active projects only (smaller, faster)';
