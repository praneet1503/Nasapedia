CREATE TABLE IF NOT EXISTS projects (
    id INT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT,
    start_date DATE,
    end_date DATE,
    trl INT,
    organization TEXT,
    technology_area TEXT,
    last_updated TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_search
ON projects
USING GIN (to_tsvector('english', title || ' ' || coalesce(description, '')));

CREATE INDEX IF NOT EXISTS idx_projects_trl ON projects(trl);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization);
CREATE INDEX IF NOT EXISTS idx_projects_tech ON projects(technology_area);
