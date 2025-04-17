-- Create POS Devices table
CREATE TABLE pos_devices (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    store_id INTEGER REFERENCES store_settings(id) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for store_id for faster lookups
CREATE INDEX pos_devices_store_id_idx ON pos_devices(store_id);