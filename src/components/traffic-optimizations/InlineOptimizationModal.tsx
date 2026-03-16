import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PLATFORM_OPTIONS, TASK_TYPE_OPTIONS, OptimizationInput } from '@/hooks/useTrafficOptimizations';
import { cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────────── */
interface ClientInfo {
  id: string;
  name: string;
  niche?: string | null;
  midias_ativas?: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientInfo | null;
  currentMemberId: string | null;
  onSubmit: (input: OptimizationInput) => Promise<any>;
  /** Pre-select task type based on context */
  preselectedTaskType?: 'checkin' | 'media' | 'alta';
}

/* ── Task type radio cards ────────────────────────────────── */
const TYPE_CARDS = [
  { value: 'checkin', label: 'Leve', time: '~5min', minutes: 5 },
  { value: 'media', label: 'Média', time: '~30min', minutes: 30 },
  { value: 'alta', label: 'Alta', time: '~1h+', minutes: 60 },
];

const PLACEHOLDER_MAP: Record<string, string> = {
  checkin: 'Observações do check-in...',
  media: 'Descreva o que foi ajustado...',
  alta: 'Descreva a otimização completa realizada...',
};

export function InlineOptimizationModal({
  open,
  onOpenChange,
  client,
  currentMemberId,
  onSubmit,
  preselectedTaskType = 'checkin',
}: Props) {
  const today = new Date().toISOString().split('T')[0];

  const [taskType, setTaskType] = useState(preselectedTaskType);
  const [optimizationDate, setOptimizationDate] = useState(today);
  const [platform, setPlatform] = useState('meta_ads');
  const [tempoGasto, setTempoGasto] = useState(TYPE_CARDS.find(t => t.value === preselectedTaskType)?.minutes || 5);
  const [description, setDescription] = useState('');
  const [checkinSaldoOk, setCheckinSaldoOk] = useState(false);
  const [checkinCampanhasRodando, setCheckinCampanhasRodando] = useState(false);
  const [checkinAlertas, setCheckinAlertas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shimmerLoading, setShimmerLoading] = useState(true);

  // Available platforms for this client
  const availablePlatforms = useMemo(() => {
    if (!client?.midias_ativas || client.midias_ativas.length === 0) return PLATFORM_OPTIONS;
    return PLATFORM_OPTIONS.filter(p =>
      client.midias_ativas!.some(m => m.toLowerCase().replace(/\s+/g, '_').includes(p.value.replace('_', '')))
      || client.midias_ativas!.some(m => p.label.toLowerCase().includes(m.toLowerCase()))
    );
  }, [client?.midias_ativas]);

  // Sync state when modal opens
  useEffect(() => {
    if (open) {
      setShimmerLoading(true);
      const timer = setTimeout(() => setShimmerLoading(false), 400);

      setTaskType(preselectedTaskType);
      setOptimizationDate(today);
      setTempoGasto(TYPE_CARDS.find(t => t.value === preselectedTaskType)?.minutes || 5);
      setDescription('');
      setCheckinSaldoOk(false);
      setCheckinCampanhasRodando(false);
      setCheckinAlertas(false);

      // Auto-select platform
      if (availablePlatforms.length === 1) {
        setPlatform(availablePlatforms[0].value);
      } else {
        setPlatform('meta_ads');
      }

      return () => clearTimeout(timer);
    }
  }, [open, preselectedTaskType, today, availablePlatforms]);

  // Update tempo when task type changes
  const handleTaskTypeChange = (type: string) => {
    setTaskType(type as any);
    const card = TYPE_CARDS.find(t => t.value === type);
    if (card) setTempoGasto(card.minutes);
  };

  const handleSubmit = async () => {
    if (!client || !tempoGasto) return;
    setSaving(true);
    await onSubmit({
      client_id: client.id,
      platform,
      task_type: taskType,
      description: description || undefined,
      tempo_gasto_minutos: tempoGasto,
      member_id: currentMemberId,
      optimization_date: optimizationDate,
      checkin_saldo_ok: taskType === 'checkin' ? checkinSaldoOk : undefined,
      checkin_campanhas_rodando: taskType === 'checkin' ? checkinCampanhasRodando : undefined,
      checkin_alertas: taskType === 'checkin' ? checkinAlertas : undefined,
    });
    setSaving(false);
    onOpenChange(false);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-6 rounded-[20px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold text-foreground">Registrar Otimização</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm text-muted-foreground">
            {client.name}
            {client.niche && (
              <span className="text-[11px] text-muted-foreground/70 bg-muted/60 border border-border/40 rounded px-1.5 py-0.5">
                {client.niche}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {shimmerLoading ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-[52px] w-full rounded-lg" />
            <div className="flex gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[52px] flex-1 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-[42px] rounded-lg" />
              <Skeleton className="h-[42px] rounded-lg" />
            </div>
            <Skeleton className="h-[42px] rounded-lg" />
            <Skeleton className="h-[80px] rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Client (readonly) */}
            <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-lg px-3.5 py-2.5">
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-foreground truncate">{client.name}</span>
            </div>

            {/* Task type radio cards */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo de Otimização</Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_CARDS.map(card => (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => handleTaskTypeChange(card.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-center transition-all duration-150',
                      'hover:scale-[1.02] active:scale-[0.98]',
                      taskType === card.value
                        ? 'bg-primary/10 border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]'
                        : 'bg-card border-border hover:border-border/80',
                    )}
                  >
                    <span className={cn(
                      'text-[13px] font-semibold block',
                      taskType === card.value ? 'text-primary' : 'text-muted-foreground',
                    )}>
                      {card.label}
                    </span>
                    <span className={cn(
                      'text-[11px] block mt-0.5',
                      taskType === card.value ? 'text-primary/70' : 'text-muted-foreground/60',
                    )}>
                      {card.time}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date + Platform */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input
                  type="date"
                  value={optimizationDate}
                  onChange={(e) => setOptimizationDate(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Plataforma</Label>
                {availablePlatforms.length === 1 ? (
                  <Input value={availablePlatforms[0].label} readOnly className="text-sm bg-muted/40" />
                ) : (
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availablePlatforms.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Time */}
            <div>
              <Label className="text-xs text-muted-foreground">
                Tempo gasto (min) <span className="text-primary">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={tempoGasto}
                onChange={(e) => setTempoGasto(parseInt(e.target.value) || 0)}
                className="font-mono text-sm"
              />
            </div>

            {/* Checklist (only for checkin/leve) */}
            <div
              className={cn(
                'overflow-hidden transition-all duration-200',
                taskType === 'checkin' ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  CHECK-IN
                </p>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={checkinSaldoOk}
                    onCheckedChange={(v) => setCheckinSaldoOk(!!v)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-transform duration-150 data-[state=checked]:scale-100"
                  />
                  <span className="text-sm text-foreground">Saldo OK?</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={checkinCampanhasRodando}
                    onCheckedChange={(v) => setCheckinCampanhasRodando(!!v)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-transform duration-150 data-[state=checked]:scale-100"
                  />
                  <span className="text-sm text-foreground">Campanhas rodando?</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={checkinAlertas}
                    onCheckedChange={(v) => setCheckinAlertas(!!v)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-transform duration-150 data-[state=checked]:scale-100"
                  />
                  <span className="text-sm text-foreground">Algum alerta?</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={PLACEHOLDER_MAP[taskType] || 'Descreva o que foi feito...'}
                rows={3}
                className="resize-y"
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !tempoGasto || shimmerLoading}
            className="bg-primary hover:bg-[#ea6c0a] transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_hsl(var(--primary)/0.19)]"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
