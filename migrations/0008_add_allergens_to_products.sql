-- Add allergen fields to products table
ALTER TABLE products
ADD COLUMN has_allergens BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN allergens JSONB;

-- Create index on has_allergens for faster filtering
CREATE INDEX idx_products_allergens ON products(has_allergens);

COMMENT ON COLUMN products.has_allergens IS 'Flag to indicate if product contains allergens';
COMMENT ON COLUMN products.allergens IS 'JSON array of allergens with name and optional severity (mild, moderate, severe)';
