import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, Sparkles, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePetronOSCategorias, usePetronOSFerramentas, usePetronOSGeracoes } from '@/hooks/usePetronOS';
import { cn } from '@/lib/utils';

function getIcon(name: string | null): React.ElementType {
  if (!name) return Zap;
  return (LucideIcons as any)[name] || Zap;
}

function getCSSColor(_token: string | null): string {
  return 'text-primary';
}

function getBgColor(_token: string | null): string {
  return 'bg-primary/12';
}

export default function PetronOSHub() {
  const navigate = useNavigate();
  const { data: categorias, isLoading: loadCat } = usePetronOSCategorias();
  const { data: ferramentas, isLoading: loadFerr } = usePetronOSFerramentas();
  const { data: recentes } = usePetronOSGeracoes(5);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!ferramentas) return [];
    let list = ferramentas;
    if (activeCategory) list = list.filter(f => f.categoria_id === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.nome.toLowerCase().includes(q) || f.descricao?.toLowerCase().includes(q));
    }
    return list;
  }, [ferramentas, activeCategory, search]);

  const groupedByCategory = useMemo(() => {
    if (!categorias) return [];
    return categorias.map(c => ({
      ...c,
      ferramentas: filtered.filter(f => f.categoria_id === c.id),
    })).filter(c => c.ferramentas.length > 0);
  }, [categorias, filtered]);

  const isLoading = loadCat || loadFerr;

  const handleToolClick = (f: typeof ferramentas extends (infer T)[] | undefined ? T : never) => {
    if (f.tipo === 'rapida') {
      navigate(`/petron-os/tool/${f.slug}`);
    } else {
      navigate(`/petron-os/builder/${f.slug}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Petron OS</h1>
          <p className="text-sm text-muted-foreground">Ferramentas internas da Petron</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/petron-os/settings')} className="gap-2">
          <Settings className="h-4 w-4" />
          Configurações
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="O que você precisa?"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            'px-3.5 py-1.5 rounded-md text-[13px] font-medium border transition-all duration-150',
            !activeCategory
              ? 'bg-orange-500/12 border-orange-500/30 text-orange-500'
              : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
          )}
        >
          Todas
        </button>
        {categorias?.map(c => {
          const active = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(active ? null : c.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-md text-[13px] font-medium border transition-all duration-150',
                active
                  ? `${getBgColor(c.cor)} border-current ${getCSSColor(c.cor)}`
                  : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {c.nome}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {/* Tool Grid by Category */}
      {!isLoading && groupedByCategory.map((cat, catIdx) => {
        const CatIcon = getIcon(cat.icone);
        return (
          <div key={cat.id} className="space-y-3" style={{ animationDelay: `${catIdx * 40}ms` }}>
            <div className="flex items-center gap-2">
              <CatIcon className={cn('h-4 w-4', getCSSColor(cat.cor))} />
              <span className="text-sm font-semibold text-foreground">{cat.nome}</span>
            </div>
            <div className="h-px bg-border/50" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {cat.ferramentas.map((f, idx) => {
                const Icon = getIcon(f.icone);
                return (
                  <button
                    key={f.id}
                    onClick={() => handleToolClick(f)}
                    className={cn(
                      'group text-left bg-card border border-border rounded-xl p-4',
                      'hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md',
                      'transition-all duration-200 animate-fade-in'
                    )}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', getBgColor(f.cor))}>
                        <Icon className={cn('h-5 w-5', getCSSColor(f.cor))} />
                      </div>
                      <span className={cn(
                        'text-[9px] font-semibold px-1.5 py-0.5 rounded',
                        f.tipo === 'rapida'
                          ? 'bg-green-500/12 text-green-500'
                          : 'bg-primary/12 text-primary'
                      )}>
                        {f.tipo === 'rapida' ? 'Rápida' : 'Documento'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{f.nome}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{f.descricao}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma ferramenta encontrada</h3>
          <p className="text-sm text-muted-foreground">Tente ajustar sua busca ou filtros</p>
        </div>
      )}

      {/* Recent generations */}
      {recentes && recentes.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recentes</h2>
          <div className="space-y-2">
            {recentes.map((g: any) => (
              <div key={g.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg text-sm">
                <Sparkles className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{g.titulo || g.petron_os_ferramentas?.nome || 'Geração'}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">
                    {new Date(g.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
