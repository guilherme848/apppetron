import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRouteAccess } from '@/hooks/useRouteAccess';
import { Loader2, ShieldX } from 'lucide-react';
import { PermissionAction } from '@/config/routeRegistry';

interface RouteGuardProps {
  children: ReactNode;
  routeId: string;
  action?: PermissionAction;
  fallback?: 'redirect' | 'forbidden';
  redirectTo?: string;
}

/**
 * Route Guard component that checks permissions before rendering content.
 * Uses the route registry permission system.
 * 
 * @param routeId - The route ID from routeRegistry (e.g., 'content.production')
 * @param action - The action to check (default: 'view')
 * @param fallback - What to do when access is denied: 'redirect' or 'forbidden'
 * @param redirectTo - Where to redirect if using 'redirect' fallback (default: '/')
 */
export function RouteGuard({ 
  children, 
  routeId, 
  action = 'view',
  fallback = 'redirect',
  redirectTo = '/',
}: RouteGuardProps) {
  const { canAccess, loading, isAdmin } = useRouteAccess();
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

  // Admin always has access
  if (isAdmin) {
    return <>{children}</>;
  }

  const hasAccess = canAccess(routeId, action);

  if (!hasAccess) {
    if (fallback === 'redirect') {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Forbidden screen
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
            Entre em contato com o administrador para solicitar acesso.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook-style permission check for conditional rendering within components.
 * Use this when you need to show/hide elements based on permissions.
 */
export function usePermissionCheck(routeId: string, action: PermissionAction = 'view'): {
  hasAccess: boolean;
  loading: boolean;
} {
  const { canAccess, loading } = useRouteAccess();
  
  return {
    hasAccess: canAccess(routeId, action),
    loading,
  };
}

/**
 * Component wrapper that only renders children if user has permission.
 * Useful for hiding UI elements like buttons or sections.
 */
interface PermissionGateProps {
  children: ReactNode;
  routeId: string;
  action?: PermissionAction;
  fallback?: ReactNode;
}

export function PermissionGate({ 
  children, 
  routeId, 
  action = 'view',
  fallback = null,
}: PermissionGateProps) {
  const { canAccess, loading, isAdmin } = useRouteAccess();

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (isAdmin || canAccess(routeId, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
