import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCrmTemplates, CrmTemplate } from '@/hooks/useCrmTemplates';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { DC } from '@/lib/dashboardColors';
import { FilePen, Plus, Trash2, Copy, ExternalLink, Edit } from 'lucide-react';
import { toast } from 'sonner';

const TEMPLATE_TYPES = [
  { value: 'call', label: 'Roteiro de Ligação' },
  { value: 'whatsapp', label: 'Mensagem WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'meeting', label: 'Reunião' },
];

const VARIABLES = [
  '{{nome_contato}}', '{{empresa}}', '{{responsavel}}',
  '{{valor_deal}}', '{{etapa_atual}}', '{{link_proposta}}',
];

export default function SalesTemplatesPage() {
  const { templates, loading, create, update, remove } = useCrmTemplates();
  const { funnels, stages, getStagesByFunnel } = useSalesCrmData();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CrmTemplate | null>(null);
  const [form, setForm] = useState({ name: '', funnel_id: '', stage_id: '', type: 'whatsapp', content: '', active: true });
  const [filterFunnel, setFilterFunnel] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const handleNew = () => {
    setEditing(null);
    setForm({ name: '', funnel_id: '', stage_id: '', type: 'whatsapp', content: '', active: true });
    setShowDialog(true);
  };

  const handleEdit = (t: CrmTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      funnel_id: t.funnel_id || '',
      stage_id: t.stage_id || '',
      type: t.type,
      content: t.content,
      active: t.active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.content) return;
    const payload = {
      name: form.name,
      funnel_id: form.funnel_id || null,
      stage_id: form.stage_id || null,
      type: form.type,
      content: form.content,
      active: form.active,
    };
    const ok = editing ? await update(editing.id, payload) : await create(payload);
    if (ok) {
      toast.success(editing ? 'Template atualizado!' : 'Template criado!');
      setShowDialog(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Mensagem copiada!');
  };

  const filtered = templates.filter(t => {
    if (filterFunnel !== 'all' && t.funnel_id !== filterFunnel) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });

  const funnelStages = form.funnel_id ? getStagesByFunnel(form.funnel_id) : [];

  // Preview with sample data
  const previewContent = form.content
    .replace(/{{nome_contato}}/g, 'João Silva')
    .replace(/{{empresa}}/g, 'Empresa ABC')
    .replace(/{{responsavel}}/g, 'Carlos')
    .replace(/{{valor_deal}}/g, 'R$ 5.000')
    .replace(/{{etapa_atual}}/g, 'Reunião Agendada')
    .replace(/{{link_proposta}}/g, 'https://proposta.link/123');

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FilePen className="h-6 w-6" style={{ color: DC.orange }} />
          <h1 className="text-xl font-bold text-foreground">Templates e Roteiros</h1>
        </div>
        <Button size="sm" onClick={handleNew} style={{ backgroundColor: DC.orange }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterFunnel} onValueChange={setFilterFunnel}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Funil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os funis</SelectItem>
            {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Funil</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => {
                const funnel = funnels.find(f => f.id === t.funnel_id);
                const stage = stages.find(s => s.id === t.stage_id);
                const typeLabel = TEMPLATE_TYPES.find(tp => tp.value === t.type)?.label || t.type;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-foreground">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{typeLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{funnel?.name || 'Genérico'}</TableCell>
                    <TableCell className="text-muted-foreground">{stage?.name || 'Todas'}</TableCell>
                    <TableCell className="text-center">
                      <Badge style={{ backgroundColor: t.active ? DC.teal : '#94A3B8' }} className="text-white">
                        {t.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(t.content)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { remove(t.id); toast.success('Template excluído'); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum template encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Mensagem de boas-vindas" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Funil (opcional)</Label>
                <Select value={form.funnel_id} onValueChange={v => setForm(f => ({ ...f, funnel_id: v, stage_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Genérico" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Genérico</SelectItem>
                    {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa (opcional)</Label>
                <Select value={form.stage_id} onValueChange={v => setForm(f => ({ ...f, stage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {funnelStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tipo de Atividade</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {VARIABLES.map(v => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="cursor-pointer text-xs hover:bg-accent"
                    onClick={() => setForm(f => ({ ...f, content: f.content + ' ' + v }))}
                  >
                    {v}
                  </Badge>
                ))}
              </div>
              <Textarea
                rows={6}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Digite o conteúdo do template..."
              />
            </div>
            {form.content && (
              <div>
                <Label className="text-muted-foreground">Preview</Label>
                <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap text-foreground">
                  {previewContent}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} style={{ backgroundColor: DC.orange }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
