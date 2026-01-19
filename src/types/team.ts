export interface TeamMember {
  id: string;
  name: string;
  role_id: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
