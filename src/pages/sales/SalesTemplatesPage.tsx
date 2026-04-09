import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCrmTemplates, CrmTemplate } from '@/hooks/useCrmTemplates';
import { useSalesCrmData } from '@/hooks/useSalesCrmData';
import { DC } from '@/lib/dashboardColors';
import { FilePen, Plus, Trash2, Copy, Edit, ChevronDown, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/content/RichTextEditor';

const TEMPLATE_TYPES = [
  { value: 'call', label: 'Roteiro de Ligação', color: DC.orange },
  { value: 'whatsapp', label: 'Mensagem WhatsApp', color: DC.teal },
  { value: 'email', label: 'E-mail', color: DC.dark },
  { value: 'meeting', label: 'Reunião', color: 'hsl(var(--primary))' },
  { value: 'task', label: 'Tarefa', color: 'hsl(var(--muted-foreground))' },
];

const DEFAULT_VARIABLES = [
  { key: 'nome_contato', label: 'Nome do contato', sample: 'João Silva' },
  { key: 'empresa', label: 'Empresa', sample: 'Empresa ABC' },
  { key: 'responsavel', label: 'Responsável', sample: 'Carlos' },
  { key: 'telefone', label: 'Telefone', sample: '(11) 99999-9999' },
  { key: 'instagram', label: 'Instagram', sample: '@joaosilva' },
  { key: 'etapa_atual', label: 'Etapa atual', sample: 'Em Contato' },
  { key: 'valor_deal', label: 'Valor do deal', sample: 'R$ 5.000' },
  { key: 'data_hoje', label: 'Data de hoje', sample: new Date().toLocaleDateString('pt-BR') },
];

export default function SalesTemplatesPage() {
  const { templates, loading, create, update, remove } = useCrmTemplates();
  const { funnels, stages, getStagesByFunnel } = useSalesCrmData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', funnel_id: '', stage_id: '', type: 'call', content: '', active: true });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const isEditing = isNew || editingId !== null;

  const handleNew = () => {
    setEditingId(null);
    setIsNew(true);
    setForm({ name: '', funnel_id: '', stage_id: '', type: 'call', content: '', active: true });
  };

  const handleEdit = (t: CrmTemplate) => {
    setIsNew(false);
    setEditingId(t.id);
    setForm({
      name: t.name,
      funnel_id: t.funnel_id || '',
      stage_id: t.stage_id || '',
      type: t.type,
      content: t.content,
      active: t.active,
    });
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Nome é obrigatório'); return; }
    const payload = {
      name: form.name,
      funnel_id: form.funnel_id || null,
      stage_id: form.stage_id || null,
      type: form.type,
      content: form.content,
      active: form.active,
    };
    const ok = editingId ? await update(editingId, payload) : await create(payload);
    if (ok) {
      toast.success(editingId ? 'Template atualizado!' : 'Template criado!');
      setIsNew(false);
      setEditingId(null);
    }
  };

  const handleDuplicate = async (t: CrmTemplate) => {
    const ok = await create({
      name: `${t.name} (cópia)`,
      funnel_id: t.funnel_id,
      stage_id: t.stage_id,
      type: t.type,
      content: t.content,
      active: false,
    });
    if (ok) toast.success('Template duplicado!');
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) toast.success('Template excluído');
  };

  const funnelStages = form.funnel_id ? getStagesByFunnel(form.funnel_id) : [];

  // Group templates by funnel for card view
  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });

  const groupedByFunnel: Record<string, CrmTemplate[]> = {};
  // Generic (no funnel)
  groupedByFunnel['generic'] = filtered.filter(t => !t.funnel_id);
  // By funnel
  funnels.forEach(f => {
    const items = filtered.filter(t => t.funnel_id === f.id);
    groupedByFunnel[f.id] = items;
  });

  // Preview
  const previewContent = DEFAULT_VARIABLES.reduce(
    (acc, v) => acc.replace(new RegExp(`{{${v.key}}}`, 'g'), v.sample),
    form.content
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  // ─── EDITING VIEW ───
  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setIsNew(false); setEditingId(null); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {editingId ? 'Editar Template' : 'Novo Template'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main form */}
          <div className="space-y-4">
            <div>
              <Label>Nome do template *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do template" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Funil vinculado</Label>
                <Select value={form.funnel_id} onValueChange={v => setForm(f => ({ ...f, funnel_id: v, stage_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Todos os funis" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os funis</SelectItem>
                    {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa vinculada</Label>
                <Select value={form.stage_id} onValueChange={v => setForm(f => ({ ...f, stage_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {funnelStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de atividade *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Conteúdo</Label>
              <div className="border rounded-md mt-1">
                <RichTextEditor
                  content={form.content}
                  onChange={v => setForm(f => ({ ...f, content: v }))}
                />
              </div>
            </div>

            {/* Preview */}
            {form.content && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ChevronDown className="h-4 w-4" /> Preview
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 rounded-lg bg-muted mt-2 prose prose-sm max-w-none text-foreground">
                    {previewContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                <Label>Ativo</Label>
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => { setIsNew(false); setEditingId(null); }}>Cancelar</Button>
                <Button onClick={handleSave} style={{ backgroundColor: DC.orange }} disabled={!form.name}>Salvar template</Button>
              </div>
            </div>
          </div>

          {/* Variables panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Variáveis disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xs text-muted-foreground mb-2">Clique para copiar e cole no editor</p>
              {DEFAULT_VARIABLES.map(v => (
                <button
                  key={v.key}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(`{{${v.key}}}`);
                    toast.success(`{{${v.key}}} copiado!`);
                  }}
                >
                  <span className="font-mono text-primary">{`{{${v.key}}}`}</span>
                  <span className="text-muted-foreground ml-2">— {v.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW (grouped by funnel) ───
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FilePen className="h-5 w-5" style={{ color: DC.orange }} />
          <h1 className="text-xl font-bold text-foreground">Templates e Roteiros</h1>
        </div>
        <Button size="sm" onClick={handleNew} style={{ backgroundColor: DC.orange }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar template..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped by funnel */}
      {funnels.map(f => (
        <Card key={f.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
              Funil: {f.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(groupedByFunnel[f.id] || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center cursor-pointer hover:text-primary" onClick={() => { handleNew(); setForm(prev => ({ ...prev, funnel_id: f.id })); }}>
                Sem templates cadastrados — clique em + para criar
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(groupedByFunnel[f.id] || []).map(t => {
                  const typeConfig = TEMPLATE_TYPES.find(tp => tp.value === t.type);
                  const stage = stages.find(s => s.id === t.stage_id);
                  return (
                    <div key={t.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <Badge variant={t.active ? 'default' : 'secondary'} className="text-[10px]"
                          style={t.active ? { backgroundColor: DC.teal } : {}}>
                          {t.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex gap-1 mb-2">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: typeConfig?.color, color: typeConfig?.color }}>
                          {typeConfig?.label}
                        </Badge>
                        {stage && <Badge variant="outline" className="text-[10px]">{stage.name}</Badge>}
                      </div>
                      {t.content && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2"
                          dangerouslySetInnerHTML={{ __html: t.content.replace(/<[^>]*>/g, ' ').slice(0, 100) }}
                        />
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(t)}>
                          <Edit className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDuplicate(t)}>
                          <Copy className="h-3 w-3 mr-1" /> Duplicar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Generic templates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Templates Genéricos (sem funil)</CardTitle>
        </CardHeader>
        <CardContent>
          {(groupedByFunnel['generic'] || []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center cursor-pointer hover:text-primary" onClick={handleNew}>
              Sem templates cadastrados — clique em + para criar
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(groupedByFunnel['generic'] || []).map(t => {
                const typeConfig = TEMPLATE_TYPES.find(tp => tp.value === t.type);
                return (
                  <div key={t.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <Badge variant={t.active ? 'default' : 'secondary'} className="text-[10px]"
                        style={t.active ? { backgroundColor: DC.teal } : {}}>
                        {t.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-[10px] mb-2" style={{ borderColor: typeConfig?.color, color: typeConfig?.color }}>
                      {typeConfig?.label}
                    </Badge>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(t)}>
                        <Edit className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDuplicate(t)}>
                        <Copy className="h-3 w-3 mr-1" /> Duplicar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
