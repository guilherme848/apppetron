import { Check, Cloud, CloudOff, RefreshCcw, Edit3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AutoSaveStatus } from '@/hooks/useAutoSave';
import { Skeleton } from '@/components/ui/skeleton';

interface SaveStatusProps {
  status: AutoSaveStatus;
  className?: string;
  onRetry?: () => void;
  showIdle?: boolean;
  size?: 'sm' | 'md';
}

export function SaveStatus({ 
  status, 
  className, 
  onRetry, 
  showIdle = false,
  size = 'md' 
}: SaveStatusProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (status === 'idle' && !showIdle) {
    return null;
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-1.5 transition-opacity duration-300',
        textSize,
        status === 'idle' && 'opacity-50',
        className
      )}
    >
      {status === 'idle' && (
        <>
          <Cloud className={cn(iconSize, 'text-muted-foreground')} />
          <span className="text-muted-foreground">Sincronizado</span>
        </>
      )}

      {status === 'pending' && (
        <>
          <Edit3 className={cn(iconSize, 'text-amber-500')} />
          <span className="text-amber-500">Alterações pendentes</span>
        </>
      )}
      
      {status === 'saving' && (
        <>
          <Loader2 className={cn(iconSize, 'text-muted-foreground animate-spin')} />
          <span className="text-muted-foreground">Salvando...</span>
        </>
      )}
      
      {status === 'saved' && (
        <>
          <Check className={cn(iconSize, 'text-green-600 dark:text-green-500')} />
          <span className="text-green-600 dark:text-green-500">Salvo</span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <CloudOff className={cn(iconSize, 'text-destructive')} />
          <span className="text-destructive">Erro ao salvar</span>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 ml-1"
              onClick={onRetry}
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// Compact inline variant for small spaces
interface SaveStatusInlineProps {
  status: AutoSaveStatus;
  className?: string;
}

export function SaveStatusInline({ status, className }: SaveStatusInlineProps) {
  if (status === 'idle') return null;

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        status === 'pending' && 'text-amber-500',
        status === 'saving' && 'text-muted-foreground',
        status === 'saved' && 'text-green-600 dark:text-green-500',
        status === 'error' && 'text-destructive',
        className
      )}
    >
      {status === 'pending' && <Edit3 className="h-3 w-3" />}
      {status === 'saving' && <Skeleton className="h-4 w-16 rounded" />}
      {status === 'saved' && <Check className="h-3 w-3" />}
      {status === 'error' && <CloudOff className="h-3 w-3" />}
    </span>
  );
}
