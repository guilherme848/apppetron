import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Guard component that restricts access to admin users only.
 * Non-admin users see a "restricted access" page with option to go back.
 * 
 * IMPORTANT: This guard should only be used INSIDE AppLayout (after AuthGuard).
 * It assumes the user is already authenticated.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, loading, member } = useAuth();
  const navigate = useNavigate();

  // Show loading while auth is being resolved
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Wait for member to be loaded before checking admin status
  if (!member) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Esta área é restrita ao Administrador do sistema.
            Entre em contato com o administrador para solicitar acesso.
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mt-4"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
