CREATE TABLE IF NOT EXISTS iss_stream_state (
    id SMALLINT PRIMARY KEY,
    leader_instance TEXT,
    lease_expires_at TIMESTAMPTZ,
    latest_payload JSONB,
    latest_timestamp BIGINT,
    latest_received_at TIMESTAMPTZ,
    upstream_ok BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO iss_stream_state (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_iss_stream_lease_expires
ON iss_stream_state (lease_expires_at);

CREATE INDEX IF NOT EXISTS idx_iss_stream_latest_timestamp
ON iss_stream_state (latest_timestamp);
