CREATE TABLE customer_addresses (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 recipient VARCHAR(150) NOT NULL, phone VARCHAR(20) NOT NULL,
 address VARCHAR(500) NOT NULL, city VARCHAR(100) NOT NULL, ward VARCHAR(100) NOT NULL,
 is_default BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON customer_addresses(user_id);
CREATE UNIQUE INDEX uk_addresses_default ON customer_addresses(user_id) WHERE is_default;
