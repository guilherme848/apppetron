import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCurrentMember } from '@/hooks/usePermissions';
import { isProfileComplete } from '@/types/team';

interface ProfileGuardProps {
  children: ReactNode;
}

const EXCLUDED_PATHS = ['/profile/setup', '/profile'];

export function ProfileGuard({ children }: ProfileGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { members, loading } = useTeamMembers();
  const { currentMemberId } = useCurrentMember();

  useEffect(() => {
    // Skip if loading or no member selected (admin mode)
    if (loading || !currentMemberId) return;

    // Skip if already on excluded paths
    if (EXCLUDED_PATHS.some(path => location.pathname.startsWith(path))) return;

    const currentMember = members.find(m => m.id === currentMemberId);
    
    // If member exists and profile is incomplete, redirect to setup
    if (currentMember && !isProfileComplete(currentMember)) {
      navigate('/profile/setup', { replace: true });
    }
  }, [loading, currentMemberId, members, navigate, location.pathname]);

  return <>{children}</>;
}
