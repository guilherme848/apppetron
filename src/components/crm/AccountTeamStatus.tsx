import { useMemo } from 'react';
import { Account } from '@/types/crm';
import { getAccountTeamStatus, PlanFlags, DEFAULT_PLAN_FLAGS } from '@/lib/accountTeam';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';

interface AccountTeamStatusProps {
  account: Account | null | undefined;
  showDetails?: boolean;
  className?: string;
}

export function AccountTeamStatus({ account, showDetails = false, className }: AccountTeamStatusProps) {
  const { services } = useSettings();

  const planFlags: PlanFlags = useMemo(() => {
    if (!account?.service_id) return DEFAULT_PLAN_FLAGS;
    const svc = services.find((s: any) => s.id === account.service_id);
    if (!svc) return DEFAULT_PLAN_FLAGS;
    return { has_content: (svc as any).has_content ?? true, has_traffic: (svc as any).has_traffic ?? true };
  }, [account?.service_id, services]);

  const status = getAccountTeamStatus(account, planFlags);
  
  if (!account) {
    return null;
  }
  
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
      {status.isComplete ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Users className="h-3 w-3 mr-1" />
              Time Completo
            </Badge>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-warning" />
            <Badge variant="attention" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Time Incompleto ({status.defined}/{status.total})
            </Badge>
          </>
        )}
      </div>
      
      {showDetails && !status.isComplete && status.missingLabels.length > 0 && (
        <p className="text-xs text-muted-foreground pl-6">
          Faltando: {status.missingLabels.join(', ')}
        </p>
      )}
    </div>
  );
}
