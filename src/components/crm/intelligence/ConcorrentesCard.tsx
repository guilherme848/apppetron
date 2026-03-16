import { useState } from 'react';
import { ClienteConcorrente } from '@/hooks/useClientIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crosshair, Instagram, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConcorrentesCardProps {
  concorrentes: ClienteConcorrente[];
  loading: boolean;
}

export function ConcorrentesCard({ concorrentes, loading }: ConcorrentesCardProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
          {concorrentes.length > 0 && (
            <Badge className="text-[11px] font-semibold bg-[hsl(var(--warning)/.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/.25)] hover:bg-[hsl(var(--warning)/.12)]">
              {concorrentes.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {concorrentes.length === 0 ? (
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
