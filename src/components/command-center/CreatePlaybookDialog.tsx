import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlaybookType, PLAYBOOK_TYPE_LABELS } from '@/types/commandCenter';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatePlaybookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  defaultType?: PlaybookType;
  onSuccess?: () => void;
}

interface TeamMember {
  id: string;
  name: string;
}

export function CreatePlaybookDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  defaultType = 'custom',
  onSuccess,
}: CreatePlaybookDialogProps) {
  const [type, setType] = useState<PlaybookType>(defaultType);
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [dueAt, setDueAt] = useState<Date>();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [csMembers, setCsMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setNotes('');
      setDueAt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default 7 days
      
      // Fetch CS members
      supabase
        .from('team_members')
        .select('id, name')
        .not('cs_member_id', 'is', null)
        .then(({ data }) => {
          if (data) setCsMembers(data);
        });
    }
  }, [open, defaultType]);

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error('Selecione um cliente');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('cs_playbooks').insert({
        client_id: clientId,
        type,
        status: 'active',
        responsible_member_id: responsibleId || null,
        due_at: dueAt?.toISOString(),
        notes_rich: notes || null,
      });

      if (error) throw error;

      toast.success('Playbook criado com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating playbook:', error);
      toast.error('Erro ao criar playbook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Plano de Ação</DialogTitle>
          {clientName && (
            <p className="text-sm text-muted-foreground">Cliente: {clientName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo de Playbook</Label>
            <Select value={type} onValueChange={(v) => setType(v as PlaybookType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLAYBOOK_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsible */}
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={responsibleId} onValueChange={setResponsibleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {csMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Prazo</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueAt ? format(dueAt, 'PPP', { locale: ptBR }) : 'Selecione...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueAt}
                  onSelect={setDueAt}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre o plano de ação..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Playbook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
