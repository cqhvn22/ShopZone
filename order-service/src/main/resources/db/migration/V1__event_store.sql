CREATE TABLE outbox_events (
 sequence_id BIGSERIAL PRIMARY KEY, event_id UUID NOT NULL UNIQUE, aggregate_id UUID NOT NULL,
 event_type VARCHAR(80) NOT NULL,payload TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),published_at TIMESTAMPTZ);
CREATE INDEX idx_outbox_pending ON outbox_events(sequence_id) WHERE published_at IS NULL;
CREATE TABLE processed_events(event_id UUID PRIMARY KEY,processed_at TIMESTAMPTZ NOT NULL DEFAULT now());
