import { useState } from 'react';
import { ClienteLink, LinkTipo, useClientIntelligence } from '@/hooks/useClientIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, ExternalLink, Globe, MapPin, Instagram, Pencil, Plus, X, Check } from 'lucide-react';

interface LinksCardProps {
  links: ClienteLink[];
  loading: boolean;
  clienteId?: string;
  onSaved?: () => void;
}

const TIPO_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  instagram: { icon: Instagram, color: 'text-pink-500', label: 'Instagram' },
  site: { icon: Globe, color: 'text-[hsl(var(--info))]', label: 'Site' },
  google_meu_negocio: { icon: MapPin, color: 'text-[hsl(var(--success))]', label: 'Google Meu Negócio' },
  outro: { icon: ExternalLink, color: 'text-muted-foreground', label: 'Link' },
};

const FIXED_TYPES: { tipo: LinkTipo; placeholder: string }[] = [
  { tipo: 'instagram', placeholder: '@handle ou URL completa' },
  { tipo: 'site', placeholder: 'https://...' },
  { tipo: 'google_meu_negocio', placeholder: 'URL do perfil no Google' },
];

export function LinksCard({ links, loading, clienteId }: LinksCardProps) {
  const [editing, setEditing] = useState(false);
  const intel = useClientIntelligence(editing ? clienteId : null);

  // Local edit state
  const [fixedValues, setFixedValues] = useState<Record<string, string>>({});
  const [fixedIds, setFixedIds] = useState<Record<string, string | undefined>>({});
  const [extras, setExtras] = useState<{ id?: string; label: string; url: string }[]>([]);

  const startEditing = () => {
    const fv: Record<string, string> = {};
    const fi: Record<string, string | undefined> = {};
    FIXED_TYPES.forEach(({ tipo }) => {
      const found = links.find(l => l.tipo === tipo);
      fv[tipo] = found?.url || '';
      fi[tipo] = found?.id;
    });
    setFixedValues(fv);
    setFixedIds(fi);
    setExtras(links.filter(l => l.tipo === 'outro').map(l => ({ id: l.id, label: l.label || '', url: l.url })));
    setEditing(true);
  };

  const saveAll = async () => {
    // Save fixed links
    for (const { tipo } of FIXED_TYPES) {
      const url = fixedValues[tipo]?.trim();
      const id = fixedIds[tipo];
      if (!url && id) {
        await intel.deleteLink(id);
      } else if (url) {
        await intel.upsertLink({ id, tipo, url });
      }
    }
    // Save extras
    for (const extra of extras) {
      if (!extra.url.trim()) {
        if (extra.id) await intel.deleteLink(extra.id);
        continue;
      }
      await intel.upsertLink({ id: extra.id, tipo: 'outro' as LinkTipo, label: extra.label || 'Link', url: extra.url });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" />Links Úteis
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {links.length > 0 && !editing && (
              <Badge className="text-[11px] font-semibold bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)] hover:bg-[hsl(var(--info)/.12)]">
                {links.length}
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
          <div className="space-y-2.5">
            {FIXED_TYPES.map(({ tipo, placeholder }) => {
              const config = TIPO_CONFIG[tipo];
              const Icon = config.icon;
              return (
                <div key={tipo} className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  <Input
                    value={fixedValues[tipo] || ''}
                    onChange={e => setFixedValues(prev => ({ ...prev, [tipo]: e.target.value }))}
                    placeholder={placeholder}
                    className="h-9 text-[13px]"
                  />
                </div>
              );
            })}
            {extras.map((extra, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={extra.label}
                  onChange={e => setExtras(prev => prev.map((ex, idx) => idx === i ? { ...ex, label: e.target.value } : ex))}
                  placeholder="Nome"
                  className="h-9 text-[13px] w-[100px]"
                />
                <Input
                  value={extra.url}
                  onChange={e => setExtras(prev => prev.map((ex, idx) => idx === i ? { ...ex, url: e.target.value } : ex))}
                  placeholder="URL"
                  className="h-9 text-[13px] flex-1"
                />
                <button type="button" onClick={() => setExtras(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {extras.length < 10 && (
              <button
                type="button"
                onClick={() => setExtras(prev => [...prev, { label: '', url: '' }])}
                className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" /> Adicionar link
              </button>
            )}
          </div>
        ) : links.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nenhum link cadastrado</p>
        ) : (
          <div className="space-y-1">
            {links.map((link) => {
              const config = TIPO_CONFIG[link.tipo] || TIPO_CONFIG.outro;
              const Icon = config.icon;
              const displayLabel = link.tipo === 'outro' && link.label ? link.label : config.label;

              return (
                <a
                  key={link.id}
                  href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors duration-150 group"
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{displayLabel}</p>
                    <p className="text-[12px] text-muted-foreground truncate">{link.url}</p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
