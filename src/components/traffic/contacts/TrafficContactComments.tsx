import { useState } from 'react';
import { useContactComments, useAddContactComment } from '@/hooks/useTrafficContacts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getProfilePhotoUrl } from '@/types/team';

interface Props {
  contactId: string;
  contactNotes?: string | null;
  currentMemberId: string;
}

export function TrafficContactComments({ contactId, contactNotes, currentMemberId }: Props) {
  const { data: comments, isLoading } = useContactComments(contactId);
  const addComment = useAddContactComment();
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addComment.mutate({ contact_id: contactId, member_id: currentMemberId, content: trimmed });
    setText('');
  };

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-3 animate-fade-in-up">
      {contactNotes && (
        <p className="text-xs italic text-muted-foreground">📝 {contactNotes}</p>
      )}

      <div className="max-h-48 overflow-y-auto space-y-2">
        {isLoading && <Skeleton className="h-16 rounded-lg" />}
        {comments?.map((c: any) => {
          const member = c.team_members;
          const photoUrl = getProfilePhotoUrl(member?.profile_photo_path);
          const initials = (member?.name || '?').slice(0, 2).toUpperCase();
          return (
            <div key={c.id} className="flex gap-2 items-start">
              <Avatar className="h-6 w-6 shrink-0">
                {photoUrl && <AvatarImage src={photoUrl} />}
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium">{member?.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-foreground/80">{c.content}</p>
              </div>
            </div>
          );
        })}
        {!isLoading && (!comments || comments.length === 0) && !contactNotes && (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhum comentário ainda</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Adicionar comentário..."
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || addComment.isPending}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
