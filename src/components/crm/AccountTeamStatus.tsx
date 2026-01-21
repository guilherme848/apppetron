import { Account } from '@/types/crm';
import { getAccountTeamStatus, ROLE_KEY_LABELS, RoleKey } from '@/lib/accountTeam';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountTeamStatusProps {
  account: Account | null | undefined;
  showDetails?: boolean;
  className?: string;
}

export function AccountTeamStatus({ account, showDetails = false, className }: AccountTeamStatusProps) {
  const status = getAccountTeamStatus(account);
  
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
            <AlertTriangle className="h-4 w-4 text-amber-500" />
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
