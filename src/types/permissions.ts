export interface Permission {
  id: string;
  key: string;
  label: string;
  created_at: string;
}

export interface MemberPermission {
  id: string;
  member_id: string;
  permission_key: string;
  allowed: boolean;
  created_at: string;
}

export type PermissionKey = 
  | 'view_dashboard'
  | 'view_crm'
  | 'edit_crm'
  | 'view_content'
  | 'edit_content'
  | 'view_tasks'
  | 'edit_tasks'
  | 'manage_settings'
  | 'view_client_credentials'
  | 'view_traffic'
  | 'edit_traffic'
  | 'manage_traffic_cycles'
  | 'view_cs'
  | 'edit_cs'
  | 'manage_cs_settings'
  | 'view_sensitive_cs';
