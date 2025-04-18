-- Add currency fields to store_settings table
ALTER TABLE store_settings
ADD COLUMN currency_code TEXT NOT NULL DEFAULT 'PHP',
ADD COLUMN currency_symbol TEXT NOT NULL DEFAULT '₱',
ADD COLUMN currency_symbol_position TEXT NOT NULL DEFAULT 'before' CHECK (currency_symbol_position IN ('before', 'after')),
ADD COLUMN decimal_separator TEXT NOT NULL DEFAULT '.',
ADD COLUMN thousands_separator TEXT NOT NULL DEFAULT ',',
ADD COLUMN decimal_places INTEGER NOT NULL DEFAULT 2;

-- Create default values for existing stores
UPDATE store_settings
SET
    currency_code = 'PHP',
    currency_symbol = '₱',
    currency_symbol_position = 'before',
    decimal_separator = '.',
    thousands_separator = ',',
    decimal_places = 2;
