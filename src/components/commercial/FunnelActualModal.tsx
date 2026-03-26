import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SalesFunnelActual, MONTH_NAMES } from '@/types/salesFunnel';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calculator } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: Date;
  actual?: SalesFunnelActual;
  onSave: (month: Date, data: Partial<SalesFunnelActual>) => Promise<boolean>;
}

export function FunnelActualModal({ open, onOpenChange, month, actual, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    investment_actual: '',
    leads_actual: '',
    cpl_actual: '',
    mql_actual: '',
    appointments_actual: '',
    meetings_held_actual: '',
    sales_actual: '',
    avg_ticket_actual: '',
    revenue_actual: '',
    roas_actual: '',
    notes: '',
  });

  useEffect(() => {
    if (actual) {
      setForm({
        investment_actual: actual.investment_actual?.toString() || '',
        leads_actual: actual.leads_actual?.toString() || '',
        cpl_actual: actual.cpl_actual?.toString() || '',
        mql_actual: actual.mql_actual?.toString() || '',
        appointments_actual: actual.appointments_actual?.toString() || '',
        meetings_held_actual: actual.meetings_held_actual?.toString() || '',
        sales_actual: actual.sales_actual?.toString() || '',
        avg_ticket_actual: actual.avg_ticket_actual?.toString() || '',
        revenue_actual: actual.revenue_actual?.toString() || '',
        roas_actual: actual.roas_actual?.toString() || '',
        notes: actual.notes || '',
      });
    } else {
      setForm({
        investment_actual: '',
        leads_actual: '',
        cpl_actual: '',
        mql_actual: '',
        appointments_actual: '',
        meetings_held_actual: '',
        sales_actual: '',
        avg_ticket_actual: '',
        revenue_actual: '',
        roas_actual: '',
        notes: '',
      });
    }
  }, [actual, open]);

  // Calculated values
  const calculatedCpl = form.investment_actual && form.leads_actual
    ? (parseFloat(form.investment_actual) / parseInt(form.leads_actual)).toFixed(2)
    : null;

  const calculatedRevenue = form.sales_actual && form.avg_ticket_actual
    ? (parseInt(form.sales_actual) * parseFloat(form.avg_ticket_actual)).toFixed(2)
    : null;

  const calculatedRoas = form.investment_actual && (form.revenue_actual || calculatedRevenue)
    ? ((parseFloat(form.revenue_actual || calculatedRevenue!) / parseFloat(form.investment_actual))).toFixed(2)
    : null;

  const handleSubmit = async () => {
    setSaving(true);
    
    const data: Partial<SalesFunnelActual> = {
      investment_actual: form.investment_actual ? parseFloat(form.investment_actual) : null,
      leads_actual: form.leads_actual ? parseInt(form.leads_actual) : null,
      cpl_actual: form.cpl_actual ? parseFloat(form.cpl_actual) : null,
      mql_actual: form.mql_actual ? parseInt(form.mql_actual) : null,
      appointments_actual: form.appointments_actual ? parseInt(form.appointments_actual) : null,
      meetings_held_actual: form.meetings_held_actual ? parseInt(form.meetings_held_actual) : null,
      sales_actual: form.sales_actual ? parseInt(form.sales_actual) : null,
      avg_ticket_actual: form.avg_ticket_actual ? parseFloat(form.avg_ticket_actual) : null,
      revenue_actual: form.revenue_actual ? parseFloat(form.revenue_actual) : null,
      roas_actual: form.roas_actual ? parseFloat(form.roas_actual) : null,
      notes: form.notes || null,
    };
    
    const success = await onSave(month, data);
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  const monthLabel = format(month, "MMMM 'de' yyyy", { locale: ptBR });

  const CalcHint = ({ value, label }: { value: string | null; label: string }) => {
    if (!value) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
              <Calculator className="h-3 w-3" />
              {value}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}: R$ {value}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Realizado - {monthLabel}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Investimento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.investment_actual}
                onChange={(e) => setForm({ ...form, investment_actual: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Leads</Label>
              <Input
                type="number"
                value={form.leads_actual}
                onChange={(e) => setForm({ ...form, leads_actual: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CPL (R$)</Label>
                <CalcHint value={calculatedCpl} label="CPL calculado" />
              </div>
              <Input
                type="number"
                step="0.01"
                value={form.cpl_actual}
                onChange={(e) => setForm({ ...form, cpl_actual: e.target.value })}
                placeholder={calculatedCpl || '0,00'}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para calcular automaticamente
              </p>
            </div>
            <div className="space-y-2">
              <Label>MQL (Leads Qualificados)</Label>
              <Input
                type="number"
                value={form.mql_actual}
                onChange={(e) => setForm({ ...form, mql_actual: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agendamentos</Label>
              <Input
                type="number"
                value={form.appointments_actual}
                onChange={(e) => setForm({ ...form, appointments_actual: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Reuniões Realizadas</Label>
              <Input
                type="number"
                value={form.meetings_held_actual}
                onChange={(e) => setForm({ ...form, meetings_held_actual: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendas</Label>
              <Input
                type="number"
                value={form.sales_actual}
                onChange={(e) => setForm({ ...form, sales_actual: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ticket Médio (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.avg_ticket_actual}
                onChange={(e) => setForm({ ...form, avg_ticket_actual: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Receita (R$)</Label>
                <CalcHint value={calculatedRevenue} label="Receita calculada" />
              </div>
              <Input
                type="number"
                step="0.01"
                value={form.revenue_actual}
                onChange={(e) => setForm({ ...form, revenue_actual: e.target.value })}
                placeholder={calculatedRevenue || '0,00'}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para calcular automaticamente
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>ROAS</Label>
              <CalcHint value={calculatedRoas} label="ROAS calculado" />
            </div>
            <Input
              type="number"
              step="0.01"
              value={form.roas_actual}
              onChange={(e) => setForm({ ...form, roas_actual: e.target.value })}
              placeholder={calculatedRoas || '0,00'}
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para calcular automaticamente
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas sobre o realizado..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
