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
  | 'view_content_extras'
  | 'edit_content_extras'
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
  | 'view_sensitive_cs'
  | 'edit_admission_date'
  | 'view_contract_values'; // Sensitive permission for contract financial values
