import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Guard component that restricts access to admin users only.
 * Non-admin users see a "restricted access" page with option to go back.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

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
            onClick={() => window.history.back()}
            className="mt-4"
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
