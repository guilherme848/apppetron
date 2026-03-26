import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ContentPost, CHANNEL_OPTIONS, FORMAT_OPTIONS, POST_STATUS_OPTIONS, PostStatus } from '@/types/contentProduction';

interface PostFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  post?: ContentPost | null;
  onSubmit: (data: { title: string; channel?: string; format?: string; status?: PostStatus; due_date?: string }) => Promise<any>;
  onUpdate?: (id: string, data: Partial<ContentPost>) => Promise<any>;
}

export function PostForm({ open, onOpenChange, batchId, post, onSubmit, onUpdate }: PostFormProps) {
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState<PostStatus>('todo');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setChannel(post.channel || '');
      setFormat(post.format || '');
      setStatus(post.status);
      setDueDate(post.due_date || '');
    } else {
      setTitle('');
      setChannel('');
      setFormat('');
      setStatus('todo');
      setDueDate('');
    }
  }, [post, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    // Block saving with 'doing' status without assignee (post being edited)
    if (status === 'doing' && post && !post.assignee_id) {
      toast.error('Atribua um responsável antes de iniciar a produção');
      return;
    }

    setLoading(true);
    const data = {
      title: title.trim(),
      channel: channel || undefined,
      format: format || undefined,
      status,
      due_date: dueDate || undefined,
    };

    if (post && onUpdate) {
      await onUpdate(post.id, data);
      toast.success('Post atualizado');
    } else {
      await onSubmit({ ...data, batch_id: batchId } as any);
      toast.success('Post criado');
    }
    
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{post ? 'Editar Post' : 'Novo Post'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reels - Depoimento Cliente"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={channel || '_none_'} onValueChange={(v) => setChannel(v === '_none_' ? '' : v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="_none_">Nenhum</SelectItem>
                  {CHANNEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={format || '_none_'} onValueChange={(v) => setFormat(v === '_none_' ? '' : v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="_none_">Nenhum</SelectItem>
                  {FORMAT_OPTIONS.map((opt) => (
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
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {POST_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Limite</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : post ? 'Salvar' : 'Criar Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
