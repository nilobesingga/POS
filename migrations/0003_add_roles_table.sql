CREATE TABLE IF NOT EXISTS "roles" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "permissions" JSONB NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default system roles
INSERT INTO "roles" ("name", "description", "is_system", "permissions")
VALUES 
  ('Admin', 'Full system access with all permissions', true, '{"canManageProducts": true, "canManageCategories": true, "canManageOrders": true, "canManageCustomers": true, "canViewCustomers": true, "canViewReports": true, "canManageSettings": true, "canManageUsers": true}'),
  ('Manager', 'Store management access', true, '{"canManageProducts": true, "canManageCategories": true, "canManageOrders": true, "canManageCustomers": true, "canViewCustomers": true, "canViewReports": true, "canManageSettings": false, "canManageUsers": false}'),
  ('Cashier', 'POS access for checkout operations', true, '{"canManageProducts": false, "canManageCategories": false, "canManageOrders": true, "canManageCustomers": false, "canViewCustomers": true, "canViewReports": false, "canManageSettings": false, "canManageUsers": false}')
ON CONFLICT DO NOTHING;