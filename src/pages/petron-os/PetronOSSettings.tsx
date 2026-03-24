import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Sparkles, Trash2, Copy, Plus, GripVertical, Play } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  usePetronOSCategorias,
  usePetronOSFerramentas,
  PetronOSFerramenta,
  PetronOSCampoFormulario,
} from '@/hooks/usePetronOS';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export default function PetronOSSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categorias } = usePetronOSCategorias();
  const { data: ferramentas, isLoading } = usePetronOSFerramentas();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PetronOSFerramenta>>({});
  const [campos, setCampos] = useState<PetronOSCampoFormulario[]>([]);
  const [saving, setSaving] = useState(false);

  // Load selected tool data
  useEffect(() => {
    if (selectedId && ferramentas) {
      const f = ferramentas.find(t => t.id === selectedId);
      if (f) {
        setForm(f);
        setCampos(f.campos_formulario || []);
      }
    }
  }, [selectedId, ferramentas]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const updateData: any = {
        nome: form.nome,
        descricao: form.descricao,
        categoria_id: form.categoria_id,
        tipo: form.tipo,
        icone: form.icone,
        cor: form.cor,
        ativo: form.ativo,
        ordem: form.ordem,
        system_prompt: form.system_prompt,
        modelo_ia: form.modelo_ia,
        max_tokens: form.max_tokens,
        campos_formulario: form.tipo === 'rapida' ? campos : null,
        perguntas_guiadas: form.perguntas_guiadas,
        estrutura_documento: form.estrutura_documento,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('petron_os_ferramentas')
        .update(updateData)
        .eq('id', selectedId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['petron-os-ferramentas'] });
      toast({ title: 'Configuração salva!' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const groupedByCat = categorias?.map(c => ({
    ...c,
    ferramentas: (ferramentas || []).filter(f => f.categoria_id === c.id),
  })) || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/petron-os" className="hover:text-foreground transition-colors">Petron OS</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Configurações</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/petron-os')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Configurações do Petron OS</h1>
          <p className="text-[13px] text-muted-foreground">Gerencie ferramentas e prompts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {/* Sidebar - tool list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <ScrollArea className="h-[600px]">
            <div className="p-3 space-y-4">
              {groupedByCat.map(cat => (
                <div key={cat.id}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                    {cat.nome}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {cat.ferramentas.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedId(f.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-[13px] transition-all',
                          selectedId === f.id
                            ? 'bg-primary/10 text-foreground font-medium border-l-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                      >
                        {f.nome}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Settings className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">Selecione uma ferramenta para editar</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-6 pr-4">
                {/* General */}
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados Gerais</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome</Label>
                      <Input value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Categoria</Label>
                      <Select value={form.categoria_id || ''} onValueChange={v => setForm(p => ({ ...p, categoria_id: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {categorias?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descrição</Label>
                    <Textarea value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={form.ativo ?? true} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
                      <Label className="text-xs">Ativa</Label>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <Label className="text-xs">Ordem</Label>
                      <Input type="number" value={form.ordem ?? 0} onChange={e => setForm(p => ({ ...p, ordem: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    Prompt da IA
                  </h3>
                  <Textarea
                    value={form.system_prompt || ''}
                    onChange={e => setForm(p => ({ ...p, system_prompt: e.target.value }))}
                    className="min-h-[300px] font-mono text-[13px] leading-relaxed"
                    placeholder="Digite o prompt que será enviado à IA..."
                  />
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <span className="text-[11px] font-semibold text-muted-foreground">Variáveis disponíveis</span>
                    <div className="flex flex-wrap gap-1.5">
                      <code className="text-[11px] font-mono bg-card px-2 py-0.5 rounded border text-orange-500">{`{{contexto_cliente}}`}</code>
                      <code className="text-[11px] font-mono bg-card px-2 py-0.5 rounded border text-orange-500">{`{{nome_cliente}}`}</code>
                      <code className="text-[11px] font-mono bg-card px-2 py-0.5 rounded border text-orange-500">{`{{nicho_cliente}}`}</code>
                      {campos.map(c => (
                        <code key={c.nome} className="text-[11px] font-mono bg-card px-2 py-0.5 rounded border text-orange-500">
                          {`{{${c.nome}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Modelo</Label>
                      <Select value={form.modelo_ia || 'google/gemini-2.5-flash'} onValueChange={v => setForm(p => ({ ...p, modelo_ia: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                          <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash</SelectItem>
                          <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                          <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max Tokens</Label>
                      <Input type="number" value={form.max_tokens ?? 2000} onChange={e => setForm(p => ({ ...p, max_tokens: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>

                {/* Form Fields (rapida only) */}
                {form.tipo === 'rapida' && (
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos do Formulário</h3>
                    {campos.map((campo, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={campo.label}
                            onChange={e => {
                              const updated = [...campos];
                              updated[idx] = { ...updated[idx], label: e.target.value };
                              setCampos(updated);
                            }}
                            placeholder="Label"
                            className="text-xs h-8"
                          />
                          <Select
                            value={campo.tipo}
                            onValueChange={v => {
                              const updated = [...campos];
                              updated[idx] = { ...updated[idx], tipo: v as any };
                              setCampos(updated);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="chips">Chips</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={campo.obrigatorio}
                              onCheckedChange={v => {
                                const updated = [...campos];
                                updated[idx] = { ...updated[idx], obrigatorio: v };
                                setCampos(updated);
                              }}
                            />
                            <span className="text-[10px] text-muted-foreground">Obrigatório</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setCampos(campos.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCampos([...campos, { nome: `campo_${campos.length + 1}`, label: '', tipo: 'text', obrigatorio: false }])}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" /> Adicionar Campo
                    </Button>
                  </div>
                )}

                {/* Save */}
                <div className="flex gap-3 justify-end pb-6">
                  <Button variant="outline" onClick={() => setSelectedId(null)}>Cancelar</Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-orange-500 to-pink-500 text-white gap-2"
                  >
                    {saving ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
