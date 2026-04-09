import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, X, Trash2, Upload, Instagram, Globe, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientIntelligence, ClienteLink, ClienteConcorrente, AnexoCategoria, LinkTipo } from '@/hooks/useClientIntelligence';
import { toast } from 'sonner';

interface IntelligenceSectionProps {
  clienteId: string;
}

// ---- Links sub-section ----
function LinksSubsection({ clienteId }: { clienteId: string }) {
  const { links, upsertLink, deleteLink, loading } = useClientIntelligence(clienteId);

  // Fixed links state
  const [instagram, setInstagram] = useState('');
  const [site, setSite] = useState('');
  const [gmb, setGmb] = useState('');
  const [extras, setExtras] = useState<{ id?: string; label: string; url: string }[]>([]);

  // Track IDs for fixed types
  const fixedIds = useRef<Record<string, string | undefined>>({});

  useEffect(() => {
    if (loading) return;
    const ig = links.find(l => l.tipo === 'instagram');
    const st = links.find(l => l.tipo === 'site');
    const gm = links.find(l => l.tipo === 'google_meu_negocio');
    const outros = links.filter(l => l.tipo === 'outro');
    setInstagram(ig?.url || '');
    setSite(st?.url || '');
    setGmb(gm?.url || '');
    fixedIds.current = { instagram: ig?.id, site: st?.id, google_meu_negocio: gm?.id };
    setExtras(outros.map(o => ({ id: o.id, label: o.label || '', url: o.url })));
  }, [links, loading]);

  const handleBlurFixed = async (tipo: LinkTipo, value: string) => {
    const id = fixedIds.current[tipo];
    if (!value.trim()) {
      if (id) { await deleteLink(id); fixedIds.current[tipo] = undefined; }
      return;
    }
    await upsertLink({ id, tipo, url: value.trim() });
  };

  const handleBlurExtra = async (index: number) => {
    const extra = extras[index];
    if (!extra.url.trim()) {
      if (extra.id) await deleteLink(extra.id);
      setExtras(prev => prev.filter((_, i) => i !== index));
      return;
    }
    await upsertLink({ id: extra.id, tipo: 'outro' as LinkTipo, label: extra.label || 'Link', url: extra.url });
  };

  if (loading) return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <div className="space-y-3">
      <Label className="text-[12px] font-semibold text-muted-foreground">Links Úteis</Label>

      {/* Instagram */}
      <div className="flex items-center gap-3">
        <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
        <div className="flex-1">
          <Input
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            onBlur={() => handleBlurFixed('instagram', instagram)}
            placeholder="@handle ou URL completa"
            className="h-[42px]"
          />
        </div>
      </div>

      {/* Site */}
      <div className="flex items-center gap-3">
        <Globe className="h-4 w-4 text-[hsl(var(--info))] shrink-0" />
        <div className="flex-1">
          <Input
            value={site}
            onChange={e => setSite(e.target.value)}
            onBlur={() => handleBlurFixed('site', site)}
            placeholder="https://..."
            className="h-[42px]"
          />
        </div>
      </div>

      {/* Google Meu Negócio */}
      <div className="flex items-center gap-3">
        <MapPin className="h-4 w-4 text-[hsl(var(--success))] shrink-0" />
        <div className="flex-1">
          <Input
            value={gmb}
            onChange={e => setGmb(e.target.value)}
            onBlur={() => handleBlurFixed('google_meu_negocio', gmb)}
            placeholder="URL do perfil no Google"
            className="h-[42px]"
          />
        </div>
      </div>

      {/* Extras */}
      {extras.map((extra, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={extra.label}
            onChange={e => setExtras(prev => prev.map((ex, idx) => idx === i ? { ...ex, label: e.target.value } : ex))}
            onBlur={() => handleBlurExtra(i)}
            placeholder="Nome do link"
            className="h-[42px] w-[140px]"
          />
          <Input
            value={extra.url}
            onChange={e => setExtras(prev => prev.map((ex, idx) => idx === i ? { ...ex, url: e.target.value } : ex))}
            onBlur={() => handleBlurExtra(i)}
            placeholder="URL"
            className="h-[42px] flex-1"
          />
          <button
            type="button"
            onClick={async () => {
              if (extra.id) await deleteLink(extra.id);
              setExtras(prev => prev.filter((_, idx) => idx !== i));
            }}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {extras.length < 10 && (
        <button
          type="button"
          onClick={() => setExtras(prev => [...prev, { label: '', url: '' }])}
          className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar link
        </button>
      )}
    </div>
  );
}

// ---- Concorrentes sub-section ----
function ConcorrentesSubsection({ clienteId }: { clienteId: string }) {
  const { concorrentes, upsertConcorrente, deleteConcorrente, loading } = useClientIntelligence(clienteId);
  const [drafts, setDrafts] = useState<{ id?: string; nome: string; instagram_url: string; site_url: string; observacoes: string }[]>([]);

  useEffect(() => {
    if (loading) return;
    setDrafts(concorrentes.map(c => ({
      id: c.id,
      nome: c.nome,
      instagram_url: c.instagram_url || '',
      site_url: c.site_url || '',
      observacoes: c.observacoes || '',
    })));
  }, [concorrentes, loading]);

  const handleBlur = async (index: number) => {
    const d = drafts[index];
    if (!d.nome.trim()) return;
    await upsertConcorrente({
      id: d.id,
      nome: d.nome.trim(),
      instagram_url: d.instagram_url || null,
      site_url: d.site_url || null,
      observacoes: d.observacoes || null,
    });
  };

  const handleAdd = () => {
    setDrafts(prev => [...prev, { nome: '', instagram_url: '', site_url: '', observacoes: '' }]);
  };

  const handleRemove = async (index: number) => {
    const d = drafts[index];
    if (d.id) await deleteConcorrente(d.id);
    setDrafts(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-[10px]" />)}</div>;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[12px] font-semibold text-muted-foreground">Concorrentes</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Registre os principais concorrentes do cliente. Estas informações serão usadas pelos agentes de IA.
        </p>
      </div>

      {drafts.map((d, i) => (
        <div key={d.id || `new-${i}`} className="relative bg-muted/40 rounded-[10px] border border-border/50 p-4 space-y-3">
          <button
            type="button"
            onClick={() => handleRemove(i)}
            className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <Input
            value={d.nome}
            onChange={e => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, nome: e.target.value } : x))}
            onBlur={() => handleBlur(i)}
            placeholder="Nome do Concorrente *"
            className="h-[42px]"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={d.instagram_url}
              onChange={e => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, instagram_url: e.target.value } : x))}
              onBlur={() => handleBlur(i)}
              placeholder="@handle ou URL"
              className="h-[42px]"
            />
            <Input
              value={d.site_url}
              onChange={e => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, site_url: e.target.value } : x))}
              onBlur={() => handleBlur(i)}
              placeholder="https://..."
              className="h-[42px]"
            />
          </div>
          <Textarea
            value={d.observacoes}
            onChange={e => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, observacoes: e.target.value } : x))}
            onBlur={() => handleBlur(i)}
            placeholder="Pontos fortes, fracos, posicionamento, preços, diferenciais..."
            className="min-h-[80px] resize-y"
          />
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Adicionar Concorrente
      </Button>
    </div>
  );
}

// ---- Arquivos sub-section ----
function ArquivosSubsection({ clienteId }: { clienteId: string }) {
  const { anexos, uploadAnexo, deleteAnexo, loading } = useClientIntelligence(clienteId);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; nome: string; categoria: AnexoCategoria; descricao: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const newPending = Array.from(files).map(f => ({
      file: f,
      nome: f.name.replace(/\.[^/.]+$/, ''),
      categoria: 'documento' as AnexoCategoria,
      descricao: '',
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
  };

  const handleUpload = async (index: number) => {
    const p = pendingFiles[index];
    setUploading(true);
    setProgress(0);
    await uploadAnexo(p.file, p.nome, p.categoria, p.descricao, setProgress);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setUploading(false);
    setProgress(0);
  };

  const handleDelete = async (id: string, url: string) => {
    await deleteAnexo(id, url);
  };

  if (loading) return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[12px] font-semibold text-muted-foreground">Arquivos</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Logos, materiais, contratos e qualquer arquivo relevante para o contexto do cliente.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all duration-200"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary/60', 'bg-primary/5'); }}
        onDragLeave={e => { e.currentTarget.classList.remove('border-primary/60', 'bg-primary/5'); }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-primary/60', 'bg-primary/5');
          handleFilesSelected(e.dataTransfer.files);
        }}
      >
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-[14px] text-muted-foreground">Arraste arquivos ou clique para selecionar</p>
        <p className="text-[12px] text-muted-foreground mt-1">Qualquer formato · Máx 50MB por arquivo</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => handleFilesSelected(e.target.files)}
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="h-[3px] rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #F4762D, #2B5B6C)' }}
          />
        </div>
      )}

      {/* Pending files */}
      {pendingFiles.map((p, i) => (
        <div key={i} className="bg-muted/40 rounded-lg border border-border/50 p-3 space-y-2">
          <Input
            value={p.nome}
            onChange={e => setPendingFiles(prev => prev.map((x, idx) => idx === i ? { ...x, nome: e.target.value } : x))}
            placeholder="Nome do arquivo"
            className="h-[38px] text-[13px]"
          />
          <div className="flex gap-2">
            <Select
              value={p.categoria}
              onValueChange={v => setPendingFiles(prev => prev.map((x, idx) => idx === i ? { ...x, categoria: v as AnexoCategoria } : x))}
            >
              <SelectTrigger className="h-[38px] w-[160px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="logo">Logo</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="briefing">Briefing</SelectItem>
                <SelectItem value="midia">Mídia</SelectItem>
                <SelectItem value="documento">Documento</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={p.descricao}
              onChange={e => setPendingFiles(prev => prev.map((x, idx) => idx === i ? { ...x, descricao: e.target.value } : x))}
              placeholder="Ex: Logo principal em fundo branco"
              className="h-[38px] flex-1 text-[13px]"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => handleUpload(i)} disabled={uploading}>
              {uploading ? <Skeleton className="h-4 w-16 rounded" /> : null}
              Enviar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}>
              Cancelar
            </Button>
          </div>
        </div>
      ))}

      {/* Existing files */}
      {anexos.length > 0 && (
        <div className="space-y-1.5">
          {anexos.map(a => (
            <div key={a.id} className="flex items-center gap-3 bg-muted/40 rounded-lg border border-border/50 px-3 py-2 group">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground truncate">{a.nome}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {a.categoria && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{a.categoria}</span>}
                  {a.arquivo_tamanho && <span className="text-[10px] text-muted-foreground font-mono">{(a.arquivo_tamanho / 1024).toFixed(0)} KB</span>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={a.arquivo_url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-background rounded">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
                </a>
                <button type="button" onClick={() => handleDelete(a.id, a.arquivo_url)} className="p-1 hover:bg-background rounded">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Main section ----
export function IntelligenceSection({ clienteId }: IntelligenceSectionProps) {
  return (
    <div className="space-y-6">
      <LinksSubsection clienteId={clienteId} />
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <ConcorrentesSubsection clienteId={clienteId} />
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <ArquivosSubsection clienteId={clienteId} />
    </div>
  );
}
