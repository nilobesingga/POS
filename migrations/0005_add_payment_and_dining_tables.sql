-- Create payment_types table
CREATE TABLE IF NOT EXISTS payment_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create dining_options table
CREATE TABLE IF NOT EXISTS dining_options (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    store_id INTEGER NOT NULL REFERENCES store_settings(id),
    available BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default dining options for each store
INSERT INTO dining_options (name, store_id, available, is_default)
SELECT 'Dine in', id, true, true FROM store_settings;

INSERT INTO dining_options (name, store_id, available, is_default)
SELECT 'Takeout', id, true, false FROM store_settings;

INSERT INTO dining_options (name, store_id, available, is_default)
SELECT 'Delivery', id, true, false FROM store_settings;
