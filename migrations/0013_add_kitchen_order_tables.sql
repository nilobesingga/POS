-- Create kitchen orders table
CREATE TABLE IF NOT EXISTS kitchen_orders (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create kitchen order items table
CREATE TABLE IF NOT EXISTS kitchen_order_items (
    id SERIAL PRIMARY KEY,
    kitchen_order_id INTEGER NOT NULL REFERENCES kitchen_orders(id),
    order_item_id INTEGER NOT NULL REFERENCES order_items(id),
    status TEXT NOT NULL DEFAULT 'pending',
    preparation_time INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create kitchen queues table
CREATE TABLE IF NOT EXISTS kitchen_queues (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    store_id INTEGER NOT NULL REFERENCES store_settings(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create kitchen queue assignments table (which products go to which queues)
CREATE TABLE IF NOT EXISTS kitchen_queue_assignments (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    queue_id INTEGER NOT NULL REFERENCES kitchen_queues(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, queue_id)
);

-- Add indexes for better performance
CREATE INDEX idx_kitchen_orders_order_id ON kitchen_orders(order_id);
CREATE INDEX idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX idx_kitchen_order_items_kitchen_order_id ON kitchen_order_items(kitchen_order_id);
CREATE INDEX idx_kitchen_order_items_status ON kitchen_order_items(status);
CREATE INDEX idx_kitchen_queues_store_id ON kitchen_queues(store_id);
CREATE INDEX idx_kitchen_queue_assignments_product_id ON kitchen_queue_assignments(product_id);
CREATE INDEX idx_kitchen_queue_assignments_queue_id ON kitchen_queue_assignments(queue_id);

-- Insert default kitchen queue for each store
INSERT INTO kitchen_queues (name, store_id)
SELECT 'Main Kitchen', id FROM store_settings;