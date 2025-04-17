-- Create discounts table
CREATE TABLE IF NOT EXISTS discounts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percent', 'amount')),
    store_id INTEGER REFERENCES store_settings(id),
    restricted_access BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
