-- Add store_id and user_id columns to orders table
ALTER TABLE orders
ADD COLUMN store_id INTEGER REFERENCES store_settings(id) NOT NULL,
ADD COLUMN user_id INTEGER REFERENCES users(id) NOT NULL;

-- Create indexes for better performance
CREATE INDEX orders_store_id_idx ON orders(store_id);
CREATE INDEX orders_user_id_idx ON orders(user_id);
