import { Users } from 'lucide-react';
import { TeamMembersTab } from '@/components/settings/TeamMembersTab';

export default function UsersPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Usuários
        </h1>
        <p className="text-muted-foreground">Membros da equipe para atribuição de tarefas.</p>
      </div>
      <TeamMembersTab />
    </>
  );
}
