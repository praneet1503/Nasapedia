-- 0002_add_project_clicks_and_popularity.sql
-- Adds adaptive feed support tables/columns/indexes

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS popularity_score DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS project_clicks (
    project_click_id SERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    visitor_uuid TEXT NOT NULL,
    clicked_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (project_id, visitor_uuid)
);

CREATE INDEX IF NOT EXISTS idx_project_clicks_project_clicked_at
ON project_clicks(project_id, clicked_at);

CREATE INDEX IF NOT EXISTS idx_projects_popularity_desc
ON projects(popularity_score DESC);
