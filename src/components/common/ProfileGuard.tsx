import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isProfileComplete } from '@/types/team';

interface ProfileGuardProps {
  children: ReactNode;
}

const EXCLUDED_PATHS = ['/profile/setup', '/profile'];

export function ProfileGuard({ children }: ProfileGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { member, loading } = useAuth();

  useEffect(() => {
    // Skip if loading
    if (loading) return;

    // Skip if already on excluded paths
    if (EXCLUDED_PATHS.some(path => location.pathname.startsWith(path))) return;

    // If member exists and profile is incomplete, redirect to setup
    if (member && !isProfileComplete(member)) {
      navigate('/profile/setup', { replace: true });
    }
  }, [loading, member, navigate, location.pathname]);

  return <>{children}</>;
}
