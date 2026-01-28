-- Migrate from contracts.values:view to financial.values:view (unified financial permission)

-- Step 1: Update the route_permissions entry
UPDATE route_permissions 
SET 
  route_id = 'financial.values',
  key = 'financial.values:view',
  label = 'Ver Valores Financeiros'
WHERE key = 'contracts.values:view';

-- Step 2: Update role_permissions to use the new key
UPDATE role_permissions 
SET permission_key = 'financial.values:view'
WHERE permission_key = 'contracts.values:view';

-- Step 3: Update user_permission_overrides to use the new key
UPDATE user_permission_overrides 
SET permission_key = 'financial.values:view'
WHERE permission_key = 'contracts.values:view';

-- Step 4: Ensure the permission exists (in case it doesn't)
INSERT INTO route_permissions (route_id, action, key, label, module, category, path, is_sensitive)
SELECT 'financial.values', 'view', 'financial.values:view', 'Ver Valores Financeiros', 'CRM', 'Contratos', '/crm', true
WHERE NOT EXISTS (SELECT 1 FROM route_permissions WHERE key = 'financial.values:view');

-- Step 5: Ensure admin has access (in case not set)
INSERT INTO role_permissions (role_key, permission_key, allowed)
SELECT 'administrador', 'financial.values:view', true
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions 
  WHERE role_key = 'administrador' AND permission_key = 'financial.values:view'
);