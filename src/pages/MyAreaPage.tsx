import { User, Briefcase, Loader2 } from 'lucide-react';
import { useMyTasks } from '@/hooks/useMyTasks';
import { useCurrentMember } from '@/hooks/usePermissions';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useJobRoles } from '@/hooks/useJobRoles';
import { TaskCounterCards } from '@/components/myarea/TaskCounterCards';
import { RoleSpecificBlocks } from '@/components/myarea/RoleSpecificBlocks';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { Badge } from '@/components/ui/badge';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function MyAreaPage() {
  const { tasks, counts, loading, currentRole } = useMyTasks();
  const { currentMemberId } = useCurrentMember();
  const { members, loading: membersLoading } = useTeamMembers();
  const { roles } = useJobRoles();

  const currentMember = members.find(m => m.id === currentMemberId);
  const roleName = currentMember?.role_id 
    ? roles.find(r => r.id === currentMember.role_id)?.name 
    : null;

  if (membersLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentMemberId || !currentMember) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            Minha Área
          </h1>
          <p className="text-muted-foreground">
            Selecione um usuário no seletor acima para ver sua área.
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Você está no modo Administrador. Selecione um usuário no menu superior.
          </p>
        </div>
      </div>
    );
  }

  const displayName = currentMember.full_name || currentMember.name;
  const firstName = displayName.split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Header with greeting */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <MemberAvatar
            name={displayName}
            photoPath={currentMember.profile_photo_path}
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {firstName}
            </h1>
            {roleName && (
              <div className="flex items-center gap-2 mt-1">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">{roleName}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task counter cards */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Minhas Tarefas
        </h2>
        <TaskCounterCards counts={counts} loading={loading} />
      </div>

      {/* Role-specific blocks */}
      {tasks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Fila de Trabalho
          </h2>
          <RoleSpecificBlocks tasks={tasks} roleName={roleName} />
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && !loading && (
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="font-semibold text-lg mb-1">Tudo em dia!</h3>
          <p className="text-muted-foreground">
            Você não tem tarefas pendentes no momento.
          </p>
        </div>
      )}
    </div>
  );
}
