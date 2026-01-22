import { Cake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { BirthdayMember } from '@/hooks/useWelcomeData';

interface BirthdayCardProps {
  members: BirthdayMember[];
  isUserBirthdayToday: boolean;
  isUserBirthdayMonth: boolean;
}

export function BirthdayCard({ members, isUserBirthdayToday, isUserBirthdayMonth }: BirthdayCardProps) {
  if (members.length === 0) {
    return (
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <Cake className="h-5 w-5 text-accent" />
            Aniversariantes do mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            Nenhum aniversariante este mês.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Contextual message
  let contextMessage = 'Gente boa também faz aniversário.';
  if (isUserBirthdayToday) {
    contextMessage = 'Hoje a Petron celebra você.';
  } else if (isUserBirthdayMonth) {
    contextMessage = 'Seu dia está chegando.';
  }

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            <Cake className="h-5 w-5 text-accent" />
            Aniversariantes do mês
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground italic mt-1">{contextMessage}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {members.map((member) => (
            <li 
              key={member.id} 
              className={`flex items-center gap-3 ${
                member.isCurrentUser ? 'bg-accent/5 -mx-2 px-2 py-2 rounded-lg' : ''
              }`}
            >
              <MemberAvatar 
                name={member.full_name || member.name} 
                photoPath={member.profile_photo_path}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm truncate ${
                    member.isCurrentUser ? 'font-medium text-foreground' : 'text-foreground'
                  }`}>
                    {member.full_name || member.name}
                  </span>
                  {member.isToday && (
                    <Badge variant="default" className="bg-accent text-accent-foreground text-xs px-1.5 py-0">
                      Hoje
                    </Badge>
                  )}
                  {member.isCurrentUser && !member.isToday && (
                    <Badge variant="outline" className="border-accent/50 text-accent text-xs px-1.5 py-0">
                      Seu mês
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">
                dia {member.day}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
