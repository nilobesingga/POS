-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES store_settings(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    opening_time TIMESTAMP NOT NULL DEFAULT NOW(),
    closing_time TIMESTAMP,
    expected_cash_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    actual_cash_amount NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_shifts_store_id ON shifts(store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_opening_time ON shifts(opening_time);
CREATE INDEX IF NOT EXISTS idx_shifts_is_active ON shifts(is_active);
