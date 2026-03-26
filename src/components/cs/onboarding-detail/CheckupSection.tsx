import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Instagram, Video, Package, MessageCircle, TrendingUp, MapPin, BarChart2,
  Check, Save, Star, ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useClienteCheckup, useUpsertCheckup,
  CheckupDimension, calcTotal, calcClassificacao, countFilled,
} from '@/hooks/useClienteCheckup';

// ── Dimension config ──
interface DimensionOption { pts: number; label: string }
interface DimensionConfig {
  key: CheckupDimension;
  label: string;
  icon: React.ElementType;
  options: DimensionOption[];
}

const DIMENSIONS: DimensionConfig[] = [
  {
    key: 'atividade_redes', label: 'Atividade nas Redes Sociais', icon: Instagram,
    options: [
      { pts: 0, label: 'Sem perfil ativo ou abandonado' },
      { pts: 1, label: 'Menos de 4 posts/mês' },
      { pts: 2, label: 'Entre 4 e 12 posts/mês' },
      { pts: 3, label: 'Mais de 12 posts/mês com consistência' },
    ],
  },
  {
    key: 'producao_video', label: 'Produção de Vídeo', icon: Video,
    options: [
      { pts: 0, label: 'Nunca cria vídeo' },
      { pts: 1, label: 'Vídeo esporádico, sem qualidade' },
      { pts: 2, label: 'Cria vídeos com alguma regularidade' },
      { pts: 3, label: 'Produz vídeo com frequência e qualidade' },
    ],
  },
  {
    key: 'mix_produtos', label: 'Mix de Produtos', icon: Package,
    options: [
      { pts: 0, label: 'Apenas básico (cimento, areia, bloco)' },
      { pts: 1, label: 'Básico + alguns itens de valor' },
      { pts: 2, label: 'Mix diversificado com algum acabamento' },
      { pts: 3, label: 'Acabamento como linha forte' },
    ],
  },
  {
    key: 'atendimento_whatsapp', label: 'Estrutura de Atendimento no WhatsApp', icon: MessageCircle,
    options: [
      { pts: 0, label: 'Dono responde quando lembra, sem horário' },
      { pts: 1, label: 'Alguém responde mas sem padrão de retorno' },
      { pts: 2, label: 'Time ou atendente dedicado, responde no mesmo dia' },
      { pts: 3, label: 'Time treinado com CRM de atendimento' },
    ],
  },
  {
    key: 'maturidade_comercial', label: 'Maturidade Comercial', icon: TrendingUp,
    options: [
      { pts: 0, label: 'Nunca faz ação comercial' },
      { pts: 1, label: 'Faz ação esporádica, sem frequência' },
      { pts: 2, label: 'Faz ações com alguma regularidade' },
      { pts: 3, label: 'Ações comerciais frequentes e consistentes' },
    ],
  },
  {
    key: 'habitantes_raio', label: 'Habitantes no Raio de Entrega', icon: MapPin,
    options: [
      { pts: 0, label: 'Menos de 30 mil habitantes' },
      { pts: 1, label: 'Entre 30 e 100 mil habitantes' },
      { pts: 2, label: 'Entre 100 e 300 mil habitantes' },
      { pts: 3, label: 'Acima de 300 mil habitantes' },
    ],
  },
  {
    key: 'tamanho_operacao', label: 'Tamanho da Operação', icon: BarChart2,
    options: [
      { pts: 0, label: 'Abaixo de R$100k/mês' },
      { pts: 1, label: 'Entre R$100k e R$300k/mês' },
      { pts: 2, label: 'Entre R$300k e R$800k/mês' },
      { pts: 3, label: 'Acima de R$800k/mês' },
    ],
  },
];

const CLASS_COLORS: Record<string, string> = {
  A: 'hsl(var(--success))',
  B: 'hsl(var(--info))',
  C: 'hsl(var(--warning))',
  D: 'hsl(var(--destructive))',
};

const CLASS_RANGES = [
  { cls: 'A', range: '18–22 pts', desc: 'Perfil A' },
  { cls: 'B', range: '13–17 pts', desc: 'Perfil B' },
  { cls: 'C', range: '7–12 pts', desc: 'Perfil C' },
  { cls: 'D', range: '0–6 pts', desc: 'Perfil D' },
];

type ValuesMap = Record<CheckupDimension, number | null>;

const emptyValues = (): ValuesMap => ({
  atividade_redes: null,
  producao_video: null,
  mix_produtos: null,
  atendimento_whatsapp: null,
  maturidade_comercial: null,
  habitantes_raio: null,
  tamanho_operacao: null,
});

interface Props {
  onboardingId: string;
  clientId: string;
  isConcluido: boolean;
}

export default function CheckupSection({ onboardingId, clientId, isConcluido }: Props) {
  const { data: existingCheckup, isLoading } = useClienteCheckup(onboardingId);
  const upsert = useUpsertCheckup();

  const [values, setValues] = useState<ValuesMap>(emptyValues());
  const [bonus, setBonus] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Load existing data
  useEffect(() => {
    if (existingCheckup) {
      const v = emptyValues();
      for (const d of DIMENSIONS) {
        v[d.key] = (existingCheckup as any)[d.key] ?? null;
      }
      setValues(v);
      setBonus(existingCheckup.bonus_acabamento || false);
    }
  }, [existingCheckup]);

  const filled = countFilled(values);
  const total = calcTotal(values, bonus);
  const classificacao = filled === 7 ? calcClassificacao(total) : null;
  const classColor = classificacao ? CLASS_COLORS[classificacao] : undefined;

  // Auto-save draft
  const autoSave = useCallback(() => {
    if (filled === 0) return;
    upsert.mutate(
      { onboardingId, clientId, values, bonus, showToast: false },
      {
        onSuccess: () => {
          setSavedIndicator(true);
          setTimeout(() => setSavedIndicator(false), 2000);
        },
      }
    );
  }, [onboardingId, clientId, values, bonus, filled, upsert]);

  const handleSelect = (key: CheckupDimension, pts: number) => {
    if (isConcluido) return;
    const newValues = { ...values, [key]: pts };
    setValues(newValues);
    // Auto-save after state update via effect would be complex, do inline
    setTimeout(() => {
      const t = calcTotal(newValues, key === 'mix_produtos' && pts < 3 ? false : bonus);
      const newBonus = key === 'mix_produtos' && pts < 3 ? false : bonus;
      if (key === 'mix_produtos' && pts < 3) setBonus(false);
      upsert.mutate(
        { onboardingId, clientId, values: newValues, bonus: newBonus, showToast: false },
        {
          onSuccess: () => {
            setSavedIndicator(true);
            setTimeout(() => setSavedIndicator(false), 2000);
          },
        }
      );
    }, 50);
  };

  const handleBonusToggle = (checked: boolean) => {
    setBonus(checked);
    setTimeout(() => {
      upsert.mutate(
        { onboardingId, clientId, values, bonus: checked, showToast: false },
        {
          onSuccess: () => {
            setSavedIndicator(true);
            setTimeout(() => setSavedIndicator(false), 2000);
          },
        }
      );
    }, 50);
  };

  const handleSave = () => {
    upsert.mutate({ onboardingId, clientId, values, bonus, showToast: true });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Checkup do Cliente
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            Avalie o cliente com base no que foi observado durante o onboarding. Esta classificação ficará registrada no perfil do cliente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="text-[11px] text-muted-foreground animate-fade-in">Salvo</span>
          )}
          {classificacao && (
            <span
              className="text-lg font-extrabold font-mono px-3 py-1 rounded-lg border"
              style={{
                color: classColor,
                background: `${classColor}15`,
                borderColor: `${classColor}40`,
              }}
            >
              {classificacao}
            </span>
          )}
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-3">
        {DIMENSIONS.map((dim, idx) => {
          const selected = values[dim.key];
          const Icon = dim.icon;
          return (
            <div
              key={dim.key}
              className="bg-card border border-border rounded-xl p-4 px-5 transition-all duration-200 hover:border-primary/40"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Dimension header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-muted-foreground font-mono">{idx + 1}</span>
                  <Icon className="h-[18px] w-[18px] text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{dim.label}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {selected != null ? `${selected}/3` : '—/3'}
                </span>
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-2">
                {dim.options.map((opt) => {
                  const isSelected = selected === opt.pts;
                  return (
                    <button
                      key={opt.pts}
                      disabled={isConcluido}
                      onClick={() => handleSelect(dim.key, opt.pts)}
                      className={cn(
                        'relative flex-1 min-w-[140px] rounded-lg border p-2.5 px-3.5 text-left transition-all duration-150',
                        'hover:bg-muted hover:border-border',
                        isSelected
                          ? 'bg-primary/10 border-primary/60'
                          : 'bg-secondary/50 border-border',
                        isConcluido && 'cursor-default opacity-70'
                      )}
                    >
                      <div className={cn(
                        'text-[10px] font-semibold uppercase',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {opt.pts === 1 ? '1 pt' : `${opt.pts} pts`}
                      </div>
                      <div className={cn(
                        'text-xs mt-1',
                        isSelected ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {opt.label}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bonus toggle for mix_produtos */}
              {dim.key === 'mix_produtos' && selected === 3 && (
                <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.2)]">
                  <Switch
                    checked={bonus}
                    onCheckedChange={handleBonusToggle}
                    disabled={isConcluido}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">Acabamento é a linha principal da loja</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.25)]">
                        +1 ponto bônus
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      O acabamento como linha forte é um diferencial de potencial de case
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result panel */}
      <div
        className="rounded-2xl p-6 border transition-all duration-300"
        style={{
          background: 'hsl(var(--muted))',
          borderColor: classColor ? `${classColor}40` : 'hsl(var(--border))',
          boxShadow: classColor ? `0 0 24px ${classColor}15` : 'none',
        }}
      >
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left — classification */}
          <div className="flex flex-col items-center gap-2 min-w-[100px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Classificação
            </span>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300"
              style={{
                background: classColor ? `${classColor}15` : 'hsl(var(--muted))',
                borderColor: classColor ? `${classColor}40` : 'hsl(var(--border))',
              }}
            >
              <span
                className="text-[28px] font-extrabold font-mono transition-colors duration-300"
                style={{ color: classColor || 'hsl(var(--muted-foreground))' }}
              >
                {classificacao || '—'}
              </span>
            </div>
            <span className="text-[13px] font-mono text-muted-foreground">
              {total} pts{bonus ? ' (inclui bônus)' : ''}
            </span>
          </div>

          {/* Right — progress bars */}
          <div className="flex-1 space-y-2">
            {DIMENSIONS.map((dim) => {
              const val = values[dim.key];
              return (
                <div key={dim.key} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground w-[160px] truncate">
                    {dim.label}
                  </span>
                  <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: val != null ? `${(val / 3) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground w-6 text-right">
                    {val ?? 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Classification table */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="space-y-1">
          {CLASS_RANGES.map((r) => {
            const isActive = classificacao === r.cls;
            const c = CLASS_COLORS[r.cls];
            return (
              <div
                key={r.cls}
                className={cn(
                  'flex items-center gap-4 px-3 py-2 rounded-lg transition-colors',
                  isActive && 'font-semibold'
                )}
                style={isActive ? { background: `${c}14` } : undefined}
              >
                <span
                  className="text-sm font-mono font-bold w-6"
                  style={{ color: c }}
                >
                  {r.cls}
                </span>
                <span className="text-xs text-muted-foreground w-[90px]">{r.range}</span>
                <span className={cn('text-xs', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {r.desc}
                </span>
                {isActive && r.cls === 'A' && <Star className="h-3 w-3 fill-current" style={{ color: c }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      {!isConcluido && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={filled === 0 || upsert.isPending}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-transform"
          >
            <Save className="h-4 w-4" />
            {upsert.isPending ? 'Salvando...' : 'Salvar Checkup'}
          </Button>
        </div>
      )}
    </div>
  );
}
