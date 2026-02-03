import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SalesFunnelTarget, MONTH_NAMES } from '@/types/salesFunnel';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: Date;
  target?: SalesFunnelTarget;
  onSave: (month: Date, data: Partial<SalesFunnelTarget>) => Promise<boolean>;
}

export function FunnelTargetModal({ open, onOpenChange, month, target, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    investment_target: '',
    leads_target: '',
    cpl_target: '',
    rate_scheduling_target: '',
    appointments_target: '',
    rate_attendance_target: '',
    meetings_held_target: '',
    rate_close_target: '',
    sales_target: '',
    avg_ticket_target: '',
    revenue_target: '',
    roas_target: '',
    notes: '',
  });

  useEffect(() => {
    if (target) {
      setForm({
        investment_target: target.investment_target?.toString() || '',
        leads_target: target.leads_target?.toString() || '',
        cpl_target: target.cpl_target?.toString() || '',
        rate_scheduling_target: target.rate_scheduling_target 
          ? (target.rate_scheduling_target * 100).toString() 
          : '',
        appointments_target: target.appointments_target?.toString() || '',
        rate_attendance_target: target.rate_attendance_target 
          ? (target.rate_attendance_target * 100).toString() 
          : '',
        meetings_held_target: target.meetings_held_target?.toString() || '',
        rate_close_target: target.rate_close_target 
          ? (target.rate_close_target * 100).toString() 
          : '',
        sales_target: target.sales_target?.toString() || '',
        avg_ticket_target: target.avg_ticket_target?.toString() || '',
        revenue_target: target.revenue_target?.toString() || '',
        roas_target: target.roas_target?.toString() || '',
        notes: target.notes || '',
      });
    } else {
      setForm({
        investment_target: '',
        leads_target: '',
        cpl_target: '',
        rate_scheduling_target: '',
        appointments_target: '',
        rate_attendance_target: '',
        meetings_held_target: '',
        rate_close_target: '',
        sales_target: '',
        avg_ticket_target: '',
        revenue_target: '',
        roas_target: '',
        notes: '',
      });
    }
  }, [target, open]);

  const handleSubmit = async () => {
    setSaving(true);
    
    const data: Partial<SalesFunnelTarget> = {
      investment_target: form.investment_target ? parseFloat(form.investment_target) : null,
      leads_target: form.leads_target ? parseInt(form.leads_target) : null,
      cpl_target: form.cpl_target ? parseFloat(form.cpl_target) : null,
      rate_scheduling_target: form.rate_scheduling_target 
        ? parseFloat(form.rate_scheduling_target) / 100 
        : null,
      appointments_target: form.appointments_target ? parseInt(form.appointments_target) : null,
      rate_attendance_target: form.rate_attendance_target 
        ? parseFloat(form.rate_attendance_target) / 100 
        : null,
      meetings_held_target: form.meetings_held_target ? parseInt(form.meetings_held_target) : null,
      rate_close_target: form.rate_close_target 
        ? parseFloat(form.rate_close_target) / 100 
        : null,
      sales_target: form.sales_target ? parseInt(form.sales_target) : null,
      avg_ticket_target: form.avg_ticket_target ? parseFloat(form.avg_ticket_target) : null,
      revenue_target: form.revenue_target ? parseFloat(form.revenue_target) : null,
      roas_target: form.roas_target ? parseFloat(form.roas_target) : null,
      notes: form.notes || null,
    };
    
    const success = await onSave(month, data);
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meta - {monthLabel}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Investimento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.investment_target}
                onChange={(e) => setForm({ ...form, investment_target: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Leads</Label>
              <Input
                type="number"
                value={form.leads_target}
                onChange={(e) => setForm({ ...form, leads_target: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CPL (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cpl_target}
                onChange={(e) => setForm({ ...form, cpl_target: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Agendamento (%)</Label>
              <Input
                type="number"
                step="0.1"
                max="100"
                value={form.rate_scheduling_target}
                onChange={(e) => setForm({ ...form, rate_scheduling_target: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agendamentos</Label>
              <Input
                type="number"
                value={form.appointments_target}
                onChange={(e) => setForm({ ...form, appointments_target: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Comparecimento (%)</Label>
              <Input
                type="number"
                step="0.1"
                max="100"
                value={form.rate_attendance_target}
                onChange={(e) => setForm({ ...form, rate_attendance_target: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reuniões Realizadas</Label>
              <Input
                type="number"
                value={form.meetings_held_target}
                onChange={(e) => setForm({ ...form, meetings_held_target: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Conversão (%)</Label>
              <Input
                type="number"
                step="0.1"
                max="100"
                value={form.rate_close_target}
                onChange={(e) => setForm({ ...form, rate_close_target: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendas</Label>
              <Input
                type="number"
                value={form.sales_target}
                onChange={(e) => setForm({ ...form, sales_target: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Ticket Médio (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.avg_ticket_target}
                onChange={(e) => setForm({ ...form, avg_ticket_target: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Receita (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.revenue_target}
                onChange={(e) => setForm({ ...form, revenue_target: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>ROAS</Label>
              <Input
                type="number"
                step="0.01"
                value={form.roas_target}
                onChange={(e) => setForm({ ...form, roas_target: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas sobre a meta..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
