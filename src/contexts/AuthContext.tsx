import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/types/team';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  member: TeamMember | null;
  isAdmin: boolean;
  loading: boolean;
  loadingProfile: boolean;
  profileError: Error | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
  retryProfileLoad: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const initialSessionResolvedRef = useRef(false);
  const isMountedRef = useRef(true);
  const memberRef = useRef<TeamMember | null>(null);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    memberRef.current = member;
  }, [member]);

  const fetchMemberData = useCallback(async (userId: string, showLoading = true): Promise<TeamMember | null> => {
    if (!isMountedRef.current) return null;
    
    // Only show loading spinner if we don't have member data yet
    // This prevents flash of "Carregando perfil" on background refreshes (e.g., tab focus)
    if (showLoading) {
      setLoadingProfile(true);
    }
    setProfileError(null);
    
    try {
      console.debug('[auth] Fetching member data for userId:', userId);
      
      // Fetch team member linked to this auth user
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (memberError) {
        console.error('[auth] Error fetching member:', memberError);
        setProfileError(new Error(memberError.message));
        setLoadingProfile(false);
        return null;
      }

      if (memberData) {
        console.debug('[auth] Member data found:', memberData.id);
        const typedMember = memberData as TeamMember;
        
        if (isMountedRef.current) {
          setMember(typedMember);
        }

        // Check if member is admin
        if (memberData.role_id) {
          const { data: roleData, error: roleError } = await supabase
            .from('job_roles')
            .select('name')
            .eq('id', memberData.role_id)
            .single();

          if (roleError) {
            console.warn('[auth] Error fetching role:', roleError);
          }

          if (roleData && isMountedRef.current) {
            const isAdminRole = roleData.name.toLowerCase().includes('admin') || 
                               roleData.name === 'Administrador';
            setIsAdmin(isAdminRole);
            console.debug('[auth] isAdmin:', isAdminRole);
          }
        }
        
        setLoadingProfile(false);
        return typedMember;
      }
      
      console.debug('[auth] No member found for userId:', userId);
      setLoadingProfile(false);
      return null;
    } catch (error) {
      console.error('[auth] Error in fetchMemberData:', error);
      if (isMountedRef.current) {
        setProfileError(error instanceof Error ? error : new Error('Erro ao carregar perfil'));
        setLoadingProfile(false);
      }
      return null;
    }
  }, []);

  const refreshMember = useCallback(async () => {
    if (user) {
      await fetchMemberData(user.id);
    }
  }, [user, fetchMemberData]);

  const retryProfileLoad = useCallback(async () => {
    if (user) {
      await fetchMemberData(user.id);
    }
  }, [user, fetchMemberData]);

  useEffect(() => {
    isMountedRef.current = true;

    console.debug('[auth] AuthProvider mounting, path:', window.location.pathname);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMountedRef.current) return;

        console.debug('[auth] onAuthStateChange', {
          event,
          hasSession: Boolean(currentSession),
          userId: currentSession?.user?.id,
          path: window.location.pathname,
          initialResolved: initialSessionResolvedRef.current,
        });
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Don't process events until initial session is resolved
        // This prevents race conditions where SIGNED_IN fires before getSession completes
        if (!initialSessionResolvedRef.current) {
          console.debug('[auth] Ignoring event before initial session resolved');
          return;
        }
        
        // Handle session changes after initial load
        if (currentSession?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          // Don't show loading if we already have member data (background refresh)
          setTimeout(async () => {
            if (!isMountedRef.current) return;
            const shouldShowLoading = !memberRef.current;
            await fetchMemberData(currentSession.user.id, shouldShowLoading);
            if (isMountedRef.current) {
              setLoading(false);
            }
          }, 0);
        } else {
          setMember(null);
          setIsAdmin(false);
          setLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          setMember(null);
          setIsAdmin(false);
          setProfileError(null);
        }
      }
    );

    // THEN check for existing session
    const initSession = async () => {
      try {
        console.debug('[auth] Getting initial session...');
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (!isMountedRef.current) return;

        if (error) {
          console.error('[auth] Error getting session:', error);
        }

        console.debug('[auth] getSession resolved', {
          hasSession: Boolean(existingSession),
          userId: existingSession?.user?.id,
          path: window.location.pathname,
        });
        
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        
        if (existingSession?.user) {
          await fetchMemberData(existingSession.user.id);
        }

        // Mark initial session as resolved BEFORE setting loading to false
        initialSessionResolvedRef.current = true;
        
        if (isMountedRef.current) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[auth] Error in initSession:', error);
        initialSessionResolvedRef.current = true;
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchMemberData]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setLoading(false);
      }
      return { error };
    } catch (error) {
      setLoading(false);
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMember(null);
    setIsAdmin(false);
    setProfileError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        member,
        isAdmin,
        loading,
        loadingProfile,
        profileError,
        signInWithEmail,
        signInWithGoogle,
        signOut,
        refreshMember,
        retryProfileLoad,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
