import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/types/team';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  member: TeamMember | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMemberData = async (userId: string): Promise<TeamMember | null> => {
    try {
      // Fetch team member linked to this auth user
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (memberError) {
        console.error('Error fetching member:', memberError);
        return null;
      }

      if (memberData) {
        const typedMember = memberData as TeamMember;
        setMember(typedMember);

        // Check if member is admin
        if (memberData.role_id) {
          const { data: roleData } = await supabase
            .from('job_roles')
            .select('name')
            .eq('id', memberData.role_id)
            .single();

          if (roleData) {
            const isAdminRole = roleData.name.toLowerCase().includes('admin') || 
                               roleData.name === 'Administrador';
            setIsAdmin(isAdminRole);
          }
        }
        return typedMember;
      }
      return null;
    } catch (error) {
      console.error('Error in fetchMemberData:', error);
      return null;
    }
  };

  const refreshMember = async () => {
    if (user) {
      await fetchMemberData(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer member data fetch to avoid deadlock
        if (session?.user) {
          setTimeout(async () => {
            if (!isMounted) return;
            await fetchMemberData(session.user.id);
            if (isMounted) {
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
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchMemberData(session.user.id);
      }
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        member,
        isAdmin,
        loading,
        signInWithEmail,
        signInWithGoogle,
        signOut,
        refreshMember,
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
