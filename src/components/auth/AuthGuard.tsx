import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, member, loadingProfile, profileError, retryProfileLoad, signOut } = useAuth();
  const location = useLocation();

  // CRITICAL: Never redirect while loading - show splash screen instead
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  // After loading is complete, if no user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle profile loading state (separate from main auth loading)
  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Handle profile fetch error - show retry option instead of breaking layout
  if (profileError && !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-4 p-8">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Email: {user.email}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => retryProfileLoad()}
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button
              onClick={() => signOut()}
              variant="outline"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
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
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => retryProfileLoad()}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar novamente
            </Button>
            <Button
              onClick={() => signOut()}
              variant="ghost"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
