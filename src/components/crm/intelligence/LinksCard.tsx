import { ClienteLink } from '@/hooks/useClientIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2, ExternalLink, Globe, MapPin, Instagram } from 'lucide-react';

interface LinksCardProps {
  links: ClienteLink[];
  loading: boolean;
}

const TIPO_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  instagram: { icon: Instagram, color: 'text-pink-500', label: 'Instagram' },
  site: { icon: Globe, color: 'text-[hsl(var(--info))]', label: 'Site' },
  google_meu_negocio: { icon: MapPin, color: 'text-[hsl(var(--success))]', label: 'Google Meu Negócio' },
  outro: { icon: ExternalLink, color: 'text-muted-foreground', label: 'Link' },
};

export function LinksCard({ links, loading }: LinksCardProps) {
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
          {links.length > 0 && (
            <Badge className="text-[11px] font-semibold bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)] hover:bg-[hsl(var(--info)/.12)]">
              {links.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
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
