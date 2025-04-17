-- Create allergens table
CREATE TABLE IF NOT EXISTS allergens (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'moderate',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_allergens_name ON allergens(name);
CREATE INDEX idx_allergens_severity ON allergens(severity);

-- Add default common allergens
INSERT INTO allergens (name, description, severity) VALUES
('Peanuts', 'All peanut and peanut-based products', 'severe'),
('Tree Nuts', 'Almonds, hazelnuts, walnuts, etc.', 'severe'),
('Milk', 'Dairy products including lactose', 'moderate'),
('Eggs', 'Chicken eggs and products containing eggs', 'moderate'),
('Wheat', 'Wheat and wheat derivatives', 'moderate'),
('Soy', 'Soybeans and soy products', 'moderate'),
('Fish', 'All fish and fish products', 'severe'),
('Shellfish', 'Shrimp, crab, lobster, etc.', 'severe'),
('Gluten', 'Found in wheat, barley, rye, oats', 'moderate'),
('Sesame', 'Sesame seeds and sesame-based products', 'moderate'),
('Mustard', 'Mustard seeds and products', 'mild'),
('Celery', 'Celery and celery seeds', 'mild'),
('Sulphites', 'Used as preservatives', 'moderate');
