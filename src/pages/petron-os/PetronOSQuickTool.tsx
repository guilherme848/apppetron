import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Copy, RefreshCw, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  usePetronOSFerramenta,
  useSaveGeracao,
  buildClientContext,
  PetronOSCampoFormulario,
} from '@/hooks/usePetronOS';
import { cn } from '@/lib/utils';

export default function PetronOSQuickTool() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: ferramenta, isLoading } = usePetronOSFerramenta(slug);
  const saveGeracao = useSaveGeracao();

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientContext, setClientContext] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  // Load active clients
  useState(() => {
    supabase
      .from('accounts')
      .select('id, name, niche, city, state')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => setClients(data || []));
  });

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 20);
    const q = clientSearch.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [clients, clientSearch]);

  const campos = ferramenta?.campos_formulario || [];

  const allRequired = useMemo(() => {
    return campos
      .filter((c: PetronOSCampoFormulario) => c.obrigatorio)
      .every((c: PetronOSCampoFormulario) => {
        const val = formValues[c.nome];
        if (c.tipo === 'chips') return Array.isArray(val) && val.length > 0;
        if (c.tipo === 'number') return val !== undefined && val !== '';
        return val && String(val).trim() !== '';
      });
  }, [campos, formValues]);

  const handleSelectClient = useCallback(async (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === 'none') {
      setClientContext('');
      return;
    }
    // Fetch intelligence
    const { data: intel } = await supabase
      .from('inteligencia_cliente')
      .select('*')
      .eq('cliente_id', clientId)
      .maybeSingle();
    const client = clients.find(c => c.id === clientId);
    setClientContext(buildClientContext(client, intel));
  }, [clients]);

  const handleGenerate = async () => {
    if (!ferramenta) return;
    setGenerating(true);
    setResults([]);

    try {
      let prompt = ferramenta.system_prompt;

      // Replace field variables
      campos.forEach((campo: PetronOSCampoFormulario) => {
        const val = formValues[campo.nome];
        const strVal = Array.isArray(val) ? val.join(', ') : String(val || '');
        prompt = prompt.split(`{{${campo.nome}}}`).join(strVal);
      });

      // Replace client context
      if (clientContext) {
        prompt = prompt.split('{{contexto_cliente}}').join(`CONTEXTO DO CLIENTE:\n${clientContext}`);
      } else {
        prompt = prompt.split('{{contexto_cliente}}').join('');
      }

      const client = clients.find(c => c.id === selectedClientId);
      prompt = prompt.split('{{nome_cliente}}').join(client?.name || '');
      prompt = prompt.split('{{nicho_cliente}}').join(client?.niche || '');

      const { data, error } = await supabase.functions.invoke('petron-os-generate', {
        body: {
          prompt,
          system_prompt: 'Você é um assistente especialista em marketing e comunicação.',
          model: ferramenta.modelo_ia,
          max_tokens: ferramenta.max_tokens,
        },
      });

      if (error) throw error;

      const content = data?.content || '';
      // Split results by --- separator or numbered items
      const parts = content.split(/\n---\n/).filter((p: string) => p.trim());
      setResults(parts.length > 1 ? parts : [content]);
    } catch (err: any) {
      toast({ title: 'Erro ao gerar', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const copyAll = () => {
    navigator.clipboard.writeText(results.join('\n\n---\n\n'));
    toast({ title: 'Todos copiados!' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
          <Skeleton className="lg:col-span-3 h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!ferramenta) return <div className="text-center py-16 text-muted-foreground">Ferramenta não encontrada</div>;

  const quantidadeField = campos.find((c: PetronOSCampoFormulario) => c.nome === 'quantidade');
  const quantidadeVal = quantidadeField ? formValues.quantidade : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/petron-os" className="hover:text-foreground transition-colors">Petron OS</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{ferramenta.nome}</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/petron-os')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{ferramenta.nome}</h1>
          <p className="text-[13px] text-muted-foreground">{ferramenta.descricao}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4">
          {/* Client selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Selecionar Cliente (opcional)</Label>
            <Select value={selectedClientId || ''} onValueChange={handleSelectClient}>
              <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <SelectItem value="none">Sem cliente</SelectItem>
                {filteredClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientId && selectedClientId !== 'none' && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {clients.find(c => c.id === selectedClientId)?.name}
                </span>
                {clientContext && <p className="mt-1 line-clamp-3">{clientContext.slice(0, 200)}...</p>}
              </div>
            )}
          </div>

          {/* Dynamic fields */}
          {campos.map((campo: PetronOSCampoFormulario) => (
            <div key={campo.nome} className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {campo.label}
                {campo.obrigatorio && <span className="text-orange-500 ml-0.5">*</span>}
              </Label>

              {campo.tipo === 'text' && (
                <Input
                  placeholder={campo.placeholder}
                  value={formValues[campo.nome] || ''}
                  onChange={e => setFormValues(p => ({ ...p, [campo.nome]: e.target.value }))}
                />
              )}

              {campo.tipo === 'textarea' && (
                <Textarea
                  placeholder={campo.placeholder}
                  value={formValues[campo.nome] || ''}
                  onChange={e => setFormValues(p => ({ ...p, [campo.nome]: e.target.value }))}
                  className="min-h-[80px] resize-y"
                />
              )}

              {campo.tipo === 'select' && (
                <Select
                  value={formValues[campo.nome] || ''}
                  onValueChange={v => setFormValues(p => ({ ...p, [campo.nome]: v }))}
                >
                  <SelectTrigger><SelectValue placeholder={campo.placeholder || 'Selecionar...'} /></SelectTrigger>
                  <SelectContent>
                    {campo.opcoes?.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {campo.tipo === 'number' && (
                  <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-[42px] w-[42px]"
                    onClick={() => setFormValues(p => ({
                      ...p,
                      [campo.nome]: Math.max(campo.min || 1, (Number(p[campo.nome]) || Number(campo.padrao) || 1) - 1),
                    }))}
                  >−</Button>
                  <Input
                    type="number"
                    value={formValues[campo.nome] ?? campo.padrao ?? ''}
                    onChange={e => setFormValues(p => ({ ...p, [campo.nome]: Number(e.target.value) }))}
                    min={campo.min}
                    max={campo.max}
                    className="text-center font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-[42px] w-[42px]"
                    onClick={() => setFormValues(p => ({
                      ...p,
                      [campo.nome]: Math.min(campo.max || 10, (Number(p[campo.nome]) || Number(campo.padrao) || 1) + 1),
                    }))}
                  >+</Button>
                </div>
              )}

              {campo.tipo === 'chips' && (
                <div className="flex flex-wrap gap-2">
                  {campo.opcoes?.map(opt => {
                    const selected = (formValues[campo.nome] || []).includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => {
                          const current = formValues[campo.nome] || [];
                          setFormValues(p => ({
                            ...p,
                            [campo.nome]: selected
                              ? current.filter((v: string) => v !== opt)
                              : [...current, opt],
                          }));
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs font-medium border transition-all',
                          selected
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Generate button */}
          <div className="pt-2 space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={!allRequired || generating}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {generating ? 'Gerando...' : quantidadeVal ? `Gerar ${quantidadeVal} textos` : 'Gerar'}
            </Button>
            <button
              onClick={() => setFormValues({})}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              Limpar tudo
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 bg-muted/30 border border-border rounded-2xl min-h-[400px]">
          {generating && (
            <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
              <Sparkles className="h-10 w-10 text-orange-500 animate-spin" style={{ animationDuration: '3s' }} />
              <p className="text-sm text-foreground font-medium">Gerando conteúdo...</p>
              <div className="w-48 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {!generating && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-20 gap-3 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Preencha o formulário e clique em Gerar</p>
            </div>
          )}

          {!generating && results.length > 0 && (
            <div className="p-4 space-y-3">
              {/* Global actions */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {results.length} resultado{results.length > 1 ? 's' : ''}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyAll} className="gap-1 text-xs">
                    <Copy className="h-3 w-3" /> Copiar Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-1 text-xs">
                    <RefreshCw className="h-3 w-3" /> Gerar Novamente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      saveGeracao.mutate({
                        ferramenta_id: ferramenta.id,
                        cliente_id: selectedClientId === 'none' ? null : selectedClientId,
                        inputs: formValues,
                        resultado: results.join('\n\n---\n\n'),
                        titulo: ferramenta.nome,
                      });
                    }}
                    className="gap-1 text-xs"
                  >
                    Salvar
                  </Button>
                </div>
              </div>

              {/* Result cards */}
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="group bg-card border border-border rounded-xl p-4 animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[11px] font-mono text-muted-foreground">#{idx + 1}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(result)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.trim()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
