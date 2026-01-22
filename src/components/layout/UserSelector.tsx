import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { MemberAvatar } from '@/components/common/MemberAvatar';

export function UserSelector() {
  const { members, loading } = useTeamMembers();
  const { currentMemberId, setCurrentMemberId } = useCurrentMember();

  const activeMembers = members.filter(m => m.active);
  const currentMember = activeMembers.find(m => m.id === currentMemberId);

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <MemberAvatar name={null} photoPath={null} size="xs" className="mr-2" />
        Carregando...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MemberAvatar
            name={currentMember?.full_name || currentMember?.name || null}
            photoPath={currentMember?.profile_photo_path || null}
            size="xs"
          />
          <span className="max-w-[120px] truncate">
            {currentMember ? (currentMember.full_name || currentMember.name) : 'Administrador'}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Usando como:
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => setCurrentMemberId(null)}
          className={!currentMemberId ? 'bg-accent' : ''}
        >
          <MemberAvatar name={null} photoPath={null} size="xs" className="mr-2" />
          <span className="flex-1">Administrador</span>
          <span className="text-xs text-muted-foreground">Acesso total</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {activeMembers.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => setCurrentMemberId(member.id)}
            className={currentMemberId === member.id ? 'bg-accent' : ''}
          >
            <MemberAvatar
              name={member.full_name || member.name}
              photoPath={member.profile_photo_path}
              size="xs"
              className="mr-2"
            />
            <span className="truncate">{member.full_name || member.name}</span>
          </DropdownMenuItem>
        ))}
        {activeMembers.length === 0 && (
          <DropdownMenuItem disabled>
            Nenhum usuário cadastrado
          </DropdownMenuItem>
        )}
        {currentMemberId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                Meu Perfil
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
