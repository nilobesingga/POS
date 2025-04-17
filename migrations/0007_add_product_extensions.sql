-- Add new columns to products table
ALTER TABLE products
ADD COLUMN cost NUMERIC,
ADD COLUMN barcode TEXT,
ADD COLUMN sold_by TEXT NOT NULL DEFAULT 'each',
ADD COLUMN is_taxable BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Create product variants table
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    option_name TEXT NOT NULL,
    option_value TEXT NOT NULL,
    price NUMERIC,
    cost NUMERIC,
    sku TEXT,
    barcode TEXT,
    stock_quantity INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create product-store relationship table
CREATE TABLE product_stores (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id INTEGER NOT NULL REFERENCES store_settings(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, store_id)
);

-- Create product-modifier relationship table
CREATE TABLE product_modifiers (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    modifier_id INTEGER NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, modifier_id)
);

-- Populate product_stores with existing products (assuming all products are available in all stores)
INSERT INTO product_stores (product_id, store_id)
SELECT p.id, s.id
FROM products p
CROSS JOIN store_settings s;