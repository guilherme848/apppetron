import { useState } from 'react';
import { ClienteConcorrente, useClientIntelligence } from '@/hooks/useClientIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Crosshair, Instagram, Globe, ChevronDown, Pencil, Plus, X, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConcorrentesCardProps {
  concorrentes: ClienteConcorrente[];
  loading: boolean;
  clienteId?: string;
}

interface Draft {
  id?: string;
  nome: string;
  instagram_url: string;
  site_url: string;
  observacoes: string;
}

export function ConcorrentesCard({ concorrentes, loading, clienteId }: ConcorrentesCardProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const intel = useClientIntelligence(editing ? clienteId : null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const startEditing = () => {
    setDrafts(concorrentes.map(c => ({
      id: c.id,
      nome: c.nome,
      instagram_url: c.instagram_url || '',
      site_url: c.site_url || '',
      observacoes: c.observacoes || '',
    })));
    setEditing(true);
  };

  const saveAll = async () => {
    // Delete removed ones
    const draftIds = drafts.filter(d => d.id).map(d => d.id);
    for (const c of concorrentes) {
      if (!draftIds.includes(c.id)) {
        await intel.deleteConcorrente(c.id);
      }
    }
    // Upsert remaining
    for (const d of drafts) {
      if (!d.nome.trim()) continue;
      await intel.upsertConcorrente({
        id: d.id,
        nome: d.nome.trim(),
        instagram_url: d.instagram_url || null,
        site_url: d.site_url || null,
        observacoes: d.observacoes || null,
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-[10px]" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Crosshair className="h-3.5 w-3.5" />Concorrentes
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {concorrentes.length > 0 && !editing && (
              <Badge className="text-[11px] font-semibold bg-[hsl(var(--warning)/.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/.25)] hover:bg-[hsl(var(--warning)/.12)]">
                {concorrentes.length}
              </Badge>
            )}
            {clienteId && !editing && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {editing && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-[hsl(var(--success))]" onClick={saveAll}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <div key={d.id || `new-${i}`} className="relative bg-muted/40 rounded-[10px] border border-border/50 p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setDrafts(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <Input
                  value={d.nome}
                  onChange={e => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, nome: e.target.value } : x))}
                  placeholder="Nome do Concorrente *"
                  className="h-9 text-[13px]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={d.instagram_url}
                    onChange={e => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, instagram_url: e.target.value } : x))}
                    placeholder="@handle ou URL"
                    className="h-9 text-[13px]"
                  />
                  <Input
                    value={d.site_url}
                    onChange={e => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, site_url: e.target.value } : x))}
                    placeholder="https://..."
                    className="h-9 text-[13px]"
                  />
                </div>
                <Textarea
                  value={d.observacoes}
                  onChange={e => setDrafts(prev => prev.map((x, idx) => idx === i ? { ...x, observacoes: e.target.value } : x))}
                  placeholder="Observações..."
                  className="min-h-[60px] resize-y text-[13px]"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setDrafts(prev => [...prev, { nome: '', instagram_url: '', site_url: '', observacoes: '' }])}
              className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> Adicionar concorrente
            </button>
          </div>
        ) : concorrentes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nenhum concorrente cadastrado</p>
        ) : (
          <div className="space-y-2">
            {concorrentes.map((c) => {
              const isOpen = expanded[c.id] ?? false;
              return (
                <div key={c.id} className="bg-muted/40 rounded-[10px] border border-border/50">
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-[13px] font-semibold text-foreground flex-1">{c.nome}</span>
                    <div className="flex items-center gap-2">
                      {c.instagram_url && (
                        <a href={c.instagram_url.startsWith('http') ? c.instagram_url : `https://instagram.com/${c.instagram_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                          <Instagram className="h-3.5 w-3.5 text-pink-500 hover:scale-110 transition-transform" />
                        </a>
                      )}
                      {c.site_url && (
                        <a href={c.site_url.startsWith('http') ? c.site_url : `https://${c.site_url}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                          <Globe className="h-3.5 w-3.5 text-[hsl(var(--info))] hover:scale-110 transition-transform" />
                        </a>
                      )}
                      <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 border-t border-border/30">
                      <p className={cn("text-[13px] pt-2", c.observacoes ? "text-muted-foreground" : "text-muted-foreground/60 italic")}>
                        {c.observacoes || 'Sem observações'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
