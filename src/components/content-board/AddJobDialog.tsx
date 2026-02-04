import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentStage, ContentJobPriority, PRIORITY_OPTIONS } from '@/types/contentBoard';
import { supabase } from '@/integrations/supabase/client';

interface Account {
  id: string;
  name: string;
  social_member_id: string | null;
}

interface AddJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: ContentStage[];
  monthOptions: { value: string; label: string }[];
  onSubmit: (job: {
    client_id: string;
    stage_id: string;
    assigned_to?: string | null;
    month_ref: string;
    due_date?: string | null;
    priority?: ContentJobPriority;
    notes?: string | null;
    status_label?: string | null;
  }) => Promise<any>;
}

export function AddJobDialog({
  open,
  onOpenChange,
  stages,
  monthOptions,
  onSubmit,
}: AddJobDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const [formData, setFormData] = useState({
    client_id: '',
    stage_id: stages[0]?.id || '',
    month_ref: currentMonth,
    due_date: '',
    priority: 'medium' as ContentJobPriority,
    notes: '',
  });

  useEffect(() => {
    if (open) {
      setLoading(true);
      supabase
        .from('accounts')
        .select('id, name, social_member_id')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name')
        .then(({ data }) => {
          setAccounts(data || []);
          setLoading(false);
        });

      // Reset form
      setFormData({
        client_id: '',
        stage_id: stages[0]?.id || '',
        month_ref: currentMonth,
        due_date: '',
        priority: 'medium',
        notes: '',
      });
    }
  }, [open, stages, currentMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.stage_id || !formData.month_ref) return;

    setSubmitting(true);
    const selectedAccount = accounts.find((a) => a.id === formData.client_id);

    await onSubmit({
      client_id: formData.client_id,
      stage_id: formData.stage_id,
      month_ref: formData.month_ref,
      due_date: formData.due_date || null,
      priority: formData.priority,
      notes: formData.notes || null,
      assigned_to: selectedAccount?.social_member_id || null,
    });

    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Cliente ao Quadro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione o cliente'} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Etapa *</Label>
              <Select
                value={formData.stage_id}
                onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mês/Período *</Label>
              <Select
                value={formData.month_ref}
                onValueChange={(value) => setFormData({ ...formData, month_ref: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as ContentJobPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas sobre este cliente..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !formData.client_id}>
              {submitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
