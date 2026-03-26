import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, Trash2, Plus, Minus, Image, Video, LayoutGrid, PlayCircle, ChevronDown, ChevronUp, Pencil, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  status?: string;
  niche?: string | null;
  niche_id?: string | null;
}

interface Suggestion {
  titulo: string;
  formato: string;
  legenda: string;
  briefing: string;
  justificativa: string;
  selected: boolean;
  expanded: boolean;
}

interface SuggestContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onContentAdded?: () => void;
}

const FORMAT_CONFIG = [
  { key: 'post', label: 'Estático', icon: Image, color: 'text-[hsl(var(--info))]' },
  { key: 'video', label: 'Vídeo', icon: Video, color: 'text-[hsl(var(--purple,270_60%_60%))]' },
  { key: 'carrossel', label: 'Carrossel', icon: LayoutGrid, color: 'text-[hsl(var(--accent-primary,24_95%_53%))]' },
  { key: 'reels', label: 'Reels', icon: PlayCircle, color: 'text-[hsl(var(--accent-secondary,340_82%_60%))]' },
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const FORMAT_BORDER_COLORS: Record<string, string> = {
  post: 'border-l-[hsl(var(--info))]',
  video: 'border-l-purple-500',
  carrossel: 'border-l-orange-500',
  reels: 'border-l-pink-500',
};

type Step = 'config' | 'loading' | 'results';

export function SuggestContentModal({ open, onOpenChange, accounts, onContentAdded }: SuggestContentModalProps) {
  const [step, setStep] = useState<Step>('config');
  const [clienteId, setClienteId] = useState('');
  const [quantidade, setQuantidade] = useState(10);
  const [formatos, setFormatos] = useState<Record<string, number>>({ post: 3, video: 2, carrossel: 3, reels: 2 });
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingText, setLoadingText] = useState('');
  const [saving, setSaving] = useState(false);
  const [completude, setCompletude] = useState<number | null>(null);

  const activeAccounts = useMemo(() => accounts.filter(a => a.status === 'active' || !a.status), [accounts]);
  const selectedAccount = activeAccounts.find(a => a.id === clienteId);

  const formatTotal = Object.values(formatos).reduce((a, b) => a + b, 0);
  const isValid = clienteId && quantidade >= 1 && quantidade <= 40 && formatTotal === quantidade;

  const updateFormat = (key: string, delta: number) => {
    setFormatos(prev => {
      const next = { ...prev };
      next[key] = Math.max(0, (next[key] || 0) + delta);
      return next;
    });
  };

  // Check completude when client changes
  const handleClientChange = async (id: string) => {
    setClienteId(id);
    const { data } = await supabase.from('inteligencia_cliente').select('*').eq('cliente_id', id).maybeSingle();
    if (!data) { setCompletude(0); return; }
    const fields = ['icp_descricao', 'icp_perfil_comprador', 'produtos_especialidades', 'produtos_carro_chefe', 'diferencial', 'tom_de_voz', 'o_que_funciona', 'posicionamento'];
    const filled = fields.filter(f => {
      const val = (data as any)[f];
      if (Array.isArray(val)) return val.length > 0;
      return val && String(val).trim().length > 0;
    });
    setCompletude(Math.round((filled.length / fields.length) * 100));
  };

  const handleGenerate = async () => {
    setStep('loading');
    const texts = [
      'Analisando o perfil do cliente...',
      'Considerando perfil e público-alvo...',
      'Elaborando pautas de conteúdo...',
      'Criando briefings e legendas...',
      'Finalizando sugestões...',
    ];
    let i = 0;
    setLoadingText(texts[0]);
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 2500);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-content', {
        body: { clienteId, quantidade, formatos, mesReferencia: mesRef },
      });

      clearInterval(interval);

      if (error || data?.error) {
        toast.error(data?.error || 'Não foi possível gerar sugestões. Tente novamente.');
        setStep('config');
        return;
      }

      const sugestoes: Suggestion[] = (data.sugestoes || []).map((s: any) => ({
        ...s,
        selected: true,
        expanded: false,
      }));
      setSuggestions(sugestoes);
      setStep('results');
    } catch {
      clearInterval(interval);
      toast.error('Erro ao conectar com o serviço de IA.');
      setStep('config');
    }
  };

  const selectedCount = suggestions.filter(s => s.selected).length;

  const handleSave = async () => {
    const selected = suggestions.filter(s => s.selected);
    if (!selected.length) return;

    setSaving(true);

    // Find or create a batch for this client+month
    const monthRef = mesRef;
    let batchId: string;
    const { data: existingBatch } = await supabase
      .from('content_batches')
      .select('id')
      .eq('client_id', clienteId)
      .eq('month_ref', monthRef)
      .eq('archived', false)
      .maybeSingle();

    if (existingBatch) {
      batchId = existingBatch.id;
    } else {
      const { data: newBatch, error } = await supabase
        .from('content_batches')
        .insert({ client_id: clienteId, month_ref: monthRef, status: 'planning' })
        .select('id')
        .single();
      if (error || !newBatch) {
        toast.error('Erro ao criar planejamento');
        setSaving(false);
        return;
      }
      batchId = newBatch.id;
    }

    // Insert posts — derive responsible_role_key from format
    const formatToRoleKey = (fmt: string): string => {
      if (['post', 'carrossel', 'carousel', 'story'].includes(fmt)) return 'designer';
      if (['video', 'vídeo', 'reels'].includes(fmt)) return 'videomaker';
      return 'social';
    };

    const posts = selected.map((s, i) => ({
      batch_id: batchId,
      title: s.titulo,
      format: s.formato,
      status: 'todo' as const,
      sort_order: i,
      sugerido_por_ia: true,
      legenda_sugerida: s.legenda,
      briefing_sugerido: s.briefing,
      caption: s.legenda,
      briefing_rich: s.briefing,
      responsible_role_key: formatToRoleKey(s.formato),
    }));

    const { error: postError } = await supabase.from('content_posts').insert(posts);
    if (postError) {
      toast.error('Erro ao salvar conteúdos');
      setSaving(false);
      return;
    }

    // Log to historico
    await supabase.from('historico_sugestoes_ia').insert({
      cliente_id: clienteId,
      mes_referencia: mesRef,
      quantidade_solicitada: quantidade,
      quantidade_aceita: selected.length,
      formatos_solicitados: formatos,
    } as any);

    toast.success(`${selected.length} conteúdos adicionados ao planejamento de ${selectedAccount?.name}`);
    setSaving(false);
    onContentAdded?.();
    handleClose();
  };

  const handleClose = () => {
    setStep('config');
    setSuggestions([]);
    setClienteId('');
    setCompletude(null);
    onOpenChange(false);
  };

  const toggleSuggestion = (idx: number) => {
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  };

  const toggleExpand = (idx: number) => {
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, expanded: !s.expanded } : s));
  };

  const updateField = (idx: number, field: 'titulo' | 'legenda' | 'briefing', value: string) => {
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "p-0 gap-0 border-border bg-card",
        step === 'results' ? 'max-w-[800px]' : 'max-w-[560px]',
      )}>
        {step === 'config' && (
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-[hsl(var(--accent-primary,24_95%_53%))]" />
                Sugerir Conteúdos com IA
              </DialogTitle>
            </DialogHeader>

            {/* Client */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Cliente</Label>
              <Select value={clienteId} onValueChange={handleClientChange}>
                <SelectTrigger className="h-[42px]"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-[280px]">
                  {activeAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {completude !== null && completude < 50 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(var(--warning,38_92%_50%)/0.1)] border border-[hsl(var(--warning,38_92%_50%)/0.3)] text-sm">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning,38_92%_50%))] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[hsl(var(--warning,38_92%_50%))] font-medium text-xs">Perfil incompleto ({completude}%)</p>
                    <p className="text-muted-foreground text-xs mt-0.5">As sugestões podem ser genéricas. Preencha a Inteligência do Cliente para melhores resultados.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quantidade */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Quantos conteúdos?</Label>
              <Input
                type="number"
                min={1}
                max={40}
                value={quantidade}
                onChange={e => setQuantidade(Math.max(1, Math.min(40, Number(e.target.value))))}
                className="h-[42px] w-32 font-mono"
              />
            </div>

            {/* Formatos */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Distribuição de Formatos</Label>
              <div className="space-y-2">
                {FORMAT_CONFIG.map(f => {
                  const Icon = f.icon;
                  return (
                    <div key={f.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', f.color)} />
                        <span className="text-sm font-medium">{f.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateFormat(f.key, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-mono text-sm">{formatos[f.key] || 0}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateFormat(f.key, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className={cn('text-xs font-mono', formatTotal !== quantidade ? 'text-destructive' : 'text-muted-foreground')}>
                Total: {formatTotal} de {quantidade}
                {formatTotal !== quantidade && ' — A soma deve ser igual à quantidade'}
              </p>
            </div>

            {/* Mês */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Mês de Referência</Label>
              <Select value={mesRef} onValueChange={setMesRef}>
                <SelectTrigger className="h-[42px]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {Array.from({ length: 6 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + i);
                    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
                    return <SelectItem key={label} value={label}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                disabled={!isValid}
                onClick={handleGenerate}
                className="bg-gradient-to-r from-[hsl(var(--accent-primary,24_95%_53%))] to-[hsl(var(--accent-secondary,340_82%_60%))] text-white hover:opacity-90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Sugestões
              </Button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="p-6 flex flex-col items-center justify-center min-h-[320px] gap-4">
            <Sparkles className="h-10 w-10 text-[hsl(var(--accent-primary,24_95%_53%))] animate-spin" style={{ animationDuration: '3s' }} />
            <p className="text-base font-medium">{loadingText}</p>
            <div className="w-64 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--accent-primary,24_95%_53%))] to-[hsl(var(--accent-secondary,340_82%_60%))] animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  Sugestões para {selectedAccount?.name}
                  <Badge variant="outline" className="bg-[hsl(var(--accent-primary,24_95%_53%)/0.1)] text-[hsl(var(--accent-primary,24_95%_53%))] border-[hsl(var(--accent-primary,24_95%_53%)/0.3)] text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" /> IA
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground">{suggestions.length} conteúdos · {mesRef}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setStep('config'); setSuggestions([]); }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Gerar Novamente
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border p-4 transition-all duration-150',
                    FORMAT_BORDER_COLORS[s.formato] || '',
                    'border-l-[3px]',
                    s.selected
                      ? 'border-[hsl(var(--accent-primary,24_95%_53%)/0.6)] bg-accent/5'
                      : 'border-border bg-card',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={s.selected}
                      onCheckedChange={() => toggleSuggestion(i)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {FORMAT_CONFIG.find(f => f.key === s.formato)?.label || s.formato}
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">#{i + 1}</span>
                      </div>
                      <input
                        value={s.titulo}
                        onChange={e => updateField(i, 'titulo', e.target.value)}
                        className="mt-1 w-full text-sm font-semibold bg-transparent border-none outline-none focus:ring-0 p-0"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleExpand(i)}>
                      {s.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  {s.expanded && (
                    <div className="mt-3 space-y-3 pl-8">
                      <div>
                        <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Legenda</Label>
                        <Textarea
                          value={s.legenda}
                          onChange={e => updateField(i, 'legenda', e.target.value)}
                          className="mt-1 text-xs min-h-[60px] resize-y"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Briefing</Label>
                        <Textarea
                          value={s.briefing}
                          onChange={e => updateField(i, 'briefing', e.target.value)}
                          className="mt-1 text-xs min-h-[60px] resize-y"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] uppercase text-muted-foreground font-semibold">Por que esse conteúdo?</Label>
                        <p className="text-xs italic text-muted-foreground mt-1">{s.justificativa}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{selectedCount} de {suggestions.length} selecionados</span>
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setSuggestions(prev => prev.map(s => ({ ...s, selected: true })))}>
                  Selecionar todos
                </Button>
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setSuggestions(prev => prev.map(s => ({ ...s, selected: false })))}>
                  Desmarcar
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button
                  disabled={selectedCount === 0 || saving}
                  onClick={handleSave}
                  className="bg-gradient-to-r from-[hsl(var(--accent-primary,24_95%_53%))] to-[hsl(var(--accent-secondary,340_82%_60%))] text-white hover:opacity-90"
                >
                  {saving ? 'Salvando...' : `Adicionar ${selectedCount} conteúdos`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
