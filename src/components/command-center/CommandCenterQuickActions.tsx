import { Button } from '@/components/ui/button';
import {
  Plus,
  Calendar,
  Send,
  AlertTriangle,
  ClipboardList,
  XCircle,
  User,
} from 'lucide-react';

interface CommandCenterQuickActionsProps {
  onCreateTask: () => void;
  onRegisterMeeting: () => void;
  onSendNps: () => void;
  onMarkAtRisk: () => void;
  onCreatePlaybook: () => void;
  onStartCancellation: () => void;
  onOpenClient360: () => void;
}

export function CommandCenterQuickActions({
  onCreateTask,
  onRegisterMeeting,
  onSendNps,
  onMarkAtRisk,
  onCreatePlaybook,
  onStartCancellation,
  onOpenClient360,
}: CommandCenterQuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg border">
      <span className="text-sm font-medium text-muted-foreground mr-2">Ações:</span>
      
      <Button variant="outline" size="sm" onClick={onCreateTask}>
        <Plus className="h-4 w-4 mr-1" />
        Tarefa
      </Button>
      
      <Button variant="outline" size="sm" onClick={onRegisterMeeting}>
        <Calendar className="h-4 w-4 mr-1" />
        Reunião
      </Button>
      
      <Button variant="outline" size="sm" onClick={onSendNps}>
        <Send className="h-4 w-4 mr-1" />
        Disparar NPS
      </Button>
      
      <Button variant="outline" size="sm" onClick={onMarkAtRisk}>
        <AlertTriangle className="h-4 w-4 mr-1" />
        Marcar Risco
      </Button>
      
      <Button variant="outline" size="sm" onClick={onCreatePlaybook}>
        <ClipboardList className="h-4 w-4 mr-1" />
        Plano de Ação
      </Button>
      
      <Button variant="outline" size="sm" onClick={onStartCancellation} className="text-destructive border-destructive/50 hover:bg-destructive/10">
        <XCircle className="h-4 w-4 mr-1" />
        Cancelamento
      </Button>
      
      <Button variant="default" size="sm" onClick={onOpenClient360} className="ml-auto">
        <User className="h-4 w-4 mr-1" />
        Abrir Cliente 360
      </Button>
    </div>
  );
}
