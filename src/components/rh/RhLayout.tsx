import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RhLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

const navItems = [
  { path: '/rh', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/rh/vagas', label: 'Vagas', icon: Briefcase },
  { path: '/rh/candidatos', label: 'Candidatos', icon: Users },
];

export function RhLayout({ children, title, description, actions }: RhLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav */}
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-1 px-6 h-12 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/trabalhe-conosco"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Página pública
            </a>
          </div>
        </div>
      </div>

      {/* Header */}
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 px-6 py-6 border-b">
          <div>
            {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
