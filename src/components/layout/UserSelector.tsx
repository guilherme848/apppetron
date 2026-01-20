import { User, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCurrentMember } from '@/hooks/usePermissions';

export function UserSelector() {
  const { members, loading } = useTeamMembers();
  const { currentMemberId, setCurrentMemberId } = useCurrentMember();

  const activeMembers = members.filter(m => m.active);
  const currentMember = activeMembers.find(m => m.id === currentMemberId);

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <User className="h-4 w-4 mr-2" />
        Carregando...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="max-w-[120px] truncate">
            {currentMember ? currentMember.name : 'Administrador'}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Usando como:
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => setCurrentMemberId(null)}
          className={!currentMemberId ? 'bg-accent' : ''}
        >
          <User className="h-4 w-4 mr-2" />
          Administrador
          <span className="ml-auto text-xs text-muted-foreground">Acesso total</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {activeMembers.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => setCurrentMemberId(member.id)}
            className={currentMemberId === member.id ? 'bg-accent' : ''}
          >
            <User className="h-4 w-4 mr-2" />
            {member.name}
          </DropdownMenuItem>
        ))}
        {activeMembers.length === 0 && (
          <DropdownMenuItem disabled>
            Nenhum usuário cadastrado
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
