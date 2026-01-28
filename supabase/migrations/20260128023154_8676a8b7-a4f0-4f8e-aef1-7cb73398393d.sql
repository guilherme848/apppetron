-- ========================================
-- Sensitive Permission: view_contract_values
-- ========================================
-- This permission controls visibility of financial values in contracts.
-- Default: OFF for all roles EXCEPT admin (Administrador)

-- 1. Add is_sensitive column to route_permissions for sensitive permissions
ALTER TABLE route_permissions ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

-- 2. Create route_permissions entry for the sensitive permission
-- Using a dummy path since this is a data-level permission, not a route
INSERT INTO route_permissions (route_id, action, key, label, module, category, path, is_sensitive)
VALUES (
  'contracts.values',
  'view',
  'contracts.values:view',
  'Ver Valores de Contratos',
  'CRM',
  'Contratos',
  '/contracts', -- Uses the contracts route path
  true
)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  module = EXCLUDED.module,
  category = EXCLUDED.category,
  is_sensitive = true;

-- 3. Set permission to ALLOWED for admin role
INSERT INTO role_permissions (role_key, permission_key, allowed)
VALUES ('administrador', 'contracts.values:view', true)
ON CONFLICT (role_key, permission_key) DO UPDATE SET allowed = true;

-- 4. Set permission to DENIED for all other existing roles
INSERT INTO role_permissions (role_key, permission_key, allowed)
SELECT role_key, 'contracts.values:view', false
FROM (SELECT DISTINCT role_key FROM role_permissions WHERE role_key != 'administrador') AS roles
ON CONFLICT (role_key, permission_key) DO UPDATE SET allowed = false;