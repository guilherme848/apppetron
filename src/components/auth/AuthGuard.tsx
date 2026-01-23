import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, member } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login with return path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but has no linked team member, show pending access
  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-foreground">Acesso Pendente</h1>
          <p className="text-muted-foreground">
            Sua conta está aguardando vinculação a um perfil de membro da equipe.
            Entre em contato com o administrador do sistema.
          </p>
          <p className="text-sm text-muted-foreground">
            Email: {user.email}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-accent hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
