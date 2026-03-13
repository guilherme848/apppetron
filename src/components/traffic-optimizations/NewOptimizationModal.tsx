import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PLATFORM_OPTIONS, TASK_TYPE_OPTIONS, OptimizationInput } from '@/hooks/useTrafficOptimizations';

// ID do cargo "Gestor de Tráfego"
const TRAFFIC_MANAGER_ROLE_ID = '29521693-8a2e-46fe-81a5-8b78059ad879';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; name: string }[];
  teamMembers: { id: string; name: string; role_id?: string | null }[];
  currentMemberId: string | null;
  onSubmit: (input: OptimizationInput) => Promise<any>;
}

export function NewOptimizationModal({ open, onOpenChange, accounts, teamMembers, currentMemberId, onSubmit }: Props) {
  const today = new Date().toISOString().split('T')[0];

  // Filtrar apenas gestores de tráfego
  const trafficManagers = useMemo(() => {
    return teamMembers.filter((m) => m.role_id === TRAFFIC_MANAGER_ROLE_ID && m.active !== false);
  }, [teamMembers]);

  const [form, setForm] = useState({
    client_id: '',
    platform: 'meta_ads',
    task_type: 'checkin',
    description: '',
    tempo_gasto_minutos: 5,
    member_id: currentMemberId || '',
    optimization_date: today,
    checkin_saldo_ok: false,
    checkin_campanhas_rodando: false,
    checkin_alertas: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.client_id) return;
    setSaving(true);
    await onSubmit({
      client_id: form.client_id,
      platform: form.platform,
      task_type: form.task_type,
      description: form.description || undefined,
      tempo_gasto_minutos: form.tempo_gasto_minutos,
      member_id: form.member_id || currentMemberId,
      optimization_date: form.optimization_date,
      checkin_saldo_ok: form.task_type === 'checkin' ? form.checkin_saldo_ok : undefined,
      checkin_campanhas_rodando: form.task_type === 'checkin' ? form.checkin_campanhas_rodando : undefined,
      checkin_alertas: form.task_type === 'checkin' ? form.checkin_alertas : undefined,
    });
    setSaving(false);
    onOpenChange(false);
    // Reset
    setForm((prev) => ({
      ...prev,
      client_id: '',
      description: '',
      tempo_gasto_minutos: 5,
      checkin_saldo_ok: false,
      checkin_campanhas_rodando: false,
      checkin_alertas: false,
    }));
  };

  const selectedType = TASK_TYPE_OPTIONS.find((t) => t.value === form.task_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Otimização</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.optimization_date}
                onChange={(e) => setForm((f) => ({ ...f, optimization_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={form.member_id} onValueChange={(v) => setForm((f) => ({ ...f, member_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                  {teamMembers.filter((m: any) => m.active !== false).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client */}
          <div>
            <Label>Cliente</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Tarefa</Label>
              <Select
                value={form.task_type}
                onValueChange={(v) => {
                  const type = TASK_TYPE_OPTIONS.find((t) => t.value === v);
                  setForm((f) => ({ ...f, task_type: v, tempo_gasto_minutos: type?.minutes || 5 }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} ({t.complexity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Check-in specific fields */}
          {form.task_type === 'checkin' && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/30">
              <p className="text-sm font-medium text-muted-foreground">Checklist do Check-in</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.checkin_saldo_ok}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, checkin_saldo_ok: !!v }))}
                />
                <span className="text-sm">Saldo OK?</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.checkin_campanhas_rodando}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, checkin_campanhas_rodando: !!v }))}
                />
                <span className="text-sm">Campanhas rodando?</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.checkin_alertas}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, checkin_alertas: !!v }))}
                />
                <span className="text-sm">Algum alerta?</span>
              </div>
            </div>
          )}

          {/* Time */}
          <div>
            <Label>Tempo gasto (minutos)</Label>
            <Input
              type="number"
              min={1}
              value={form.tempo_gasto_minutos}
              onChange={(e) => setForm((f) => ({ ...f, tempo_gasto_minutos: parseInt(e.target.value) || 0 }))}
            />
            {selectedType && (
              <p className="text-xs text-muted-foreground mt-1">
                Sugestão: ~{selectedType.minutes} min para {selectedType.label}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>Descrição / Comentário</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descreva o que foi feito e o que mudou..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.client_id}>
            {saving ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
