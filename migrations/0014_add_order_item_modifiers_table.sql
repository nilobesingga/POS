-- Create order_item_modifiers table to track modifiers added to order items
CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER NOT NULL REFERENCES order_items(id),
    modifier_id INTEGER NOT NULL REFERENCES modifiers(id),
    modifier_option_id INTEGER REFERENCES modifier_options(id),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS order_item_modifiers_order_item_id_idx ON order_item_modifiers (order_item_id);
CREATE INDEX IF NOT EXISTS order_item_modifiers_modifier_id_idx ON order_item_modifiers (modifier_id);
