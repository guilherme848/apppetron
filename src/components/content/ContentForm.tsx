import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ContentItem, ContentStatus, ContentPriority, CONTENT_STATUS_OPTIONS, CONTENT_PRIORITY_OPTIONS, CHANNEL_OPTIONS, FORMAT_OPTIONS } from '@/types/content';
import { Account } from '@/types/crm';

interface ContentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ContentItem>) => Promise<void>;
  content?: ContentItem;
  accounts: Account[];
}

export function ContentForm({ open, onClose, onSubmit, content, accounts }: ContentFormProps) {
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    channel: '',
    format: '',
    status: 'backlog' as ContentStatus,
    priority: 'medium' as ContentPriority,
    owner: '',
    due_date: '',
    scheduled_at: '',
    brief: '',
    copy_text: '',
    creative_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (content) {
      setFormData({
        client_id: content.client_id || '',
        title: content.title,
        channel: content.channel || '',
        format: content.format || '',
        status: content.status,
        priority: content.priority,
        owner: content.owner || '',
        due_date: content.due_date || '',
        scheduled_at: content.scheduled_at ? content.scheduled_at.slice(0, 16) : '',
        brief: content.brief || '',
        copy_text: content.copy_text || '',
        creative_notes: content.creative_notes || '',
      });
    } else {
      setFormData({
        client_id: '',
        title: '',
        channel: '',
        format: '',
        status: 'backlog',
        priority: 'medium',
        owner: '',
        due_date: '',
        scheduled_at: '',
        brief: '',
        copy_text: '',
        creative_notes: '',
      });
    }
  }, [content, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    setSubmitting(true);
    await onSubmit({
      client_id: formData.client_id || null,
      title: formData.title.trim(),
      channel: formData.channel || null,
      format: formData.format || null,
      status: formData.status,
      priority: formData.priority,
      owner: formData.owner || null,
      due_date: formData.due_date || null,
      scheduled_at: formData.scheduled_at || null,
      brief: formData.brief || null,
      copy_text: formData.copy_text || null,
      creative_notes: formData.creative_notes || null,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{content ? 'Editar Conteúdo' : 'Novo Conteúdo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título do conteúdo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {CHANNEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Formato</Label>
              <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ContentStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as ContentPriority })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Responsável</Label>
              <Input
                id="owner"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Prazo</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Agendamento</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brief">Brief</Label>
            <Textarea
              id="brief"
              value={formData.brief}
              onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
              placeholder="Briefing do conteúdo..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="copy_text">Copy</Label>
            <Textarea
              id="copy_text"
              value={formData.copy_text}
              onChange={(e) => setFormData({ ...formData, copy_text: e.target.value })}
              placeholder="Texto/copy do conteúdo..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creative_notes">Notas Criativas</Label>
            <Textarea
              id="creative_notes"
              value={formData.creative_notes}
              onChange={(e) => setFormData({ ...formData, creative_notes: e.target.value })}
              placeholder="Observações para o time criativo..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
