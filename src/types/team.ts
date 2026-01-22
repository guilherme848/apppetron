export interface TeamMember {
  id: string;
  name: string;
  full_name: string | null;
  role_id: string | null;
  email: string | null;
  active: boolean;
  birth_date: string | null;
  admission_date: string | null;
  profile_photo_path: string | null;
  profile_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function isProfileComplete(member: TeamMember): boolean {
  return !!(member.full_name && member.birth_date);
}

export function getProfilePhotoUrl(path: string | null): string | null {
  if (!path) return null;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-photos/${path}`;
}
