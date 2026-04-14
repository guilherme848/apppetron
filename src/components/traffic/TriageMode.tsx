import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientMonitoringRow } from '@/hooks/useMetaMonitoring';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: number) {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function loadReviewed(): Set<string> {
  try {
    const raw = localStorage.getItem(`central-review-${todayKey()}`);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveReviewed(ids: Set<string>) {
  try {
    localStorage.setItem(`central-review-${todayKey()}`, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rows: ClientMonitoringRow[];
  onOpenDetails?: (row: ClientMonitoringRow) => void;
}

export function TriageMode({ open, onOpenChange, rows, onOpenDetails }: Props) {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => loadReviewed());

  useEffect(() => {
    if (open) setReviewedIds(loadReviewed());
  }, [open]);

  const critical = useMemo(
    () => rows.filter(r => r.health === 'red' || r.health === 'yellow')
              .sort((a, b) => (a.health === 'red' ? 0 : 1) - (b.health === 'red' ? 0 : 1))
    , [rows]
  );

  const pending = critical.filter(r => !reviewedIds.has(r.client_id + r.ad_account_id));
  const done = critical.filter(r => reviewedIds.has(r.client_id + r.ad_account_id));

  const markReviewed = (r: ClientMonitoringRow) => {
    const key = r.client_id + r.ad_account_id;
    const next = new Set(reviewedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setReviewedIds(next);
    saveReviewed(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Modo Triagem Matinal
            <Badge variant="outline" className="ml-auto text-xs">
              {pending.length} pendente{pending.length === 1 ? '' : 's'} · {done.length} revisado{done.length === 1 ? '' : 's'}
            </Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Foco nos clientes em atenção/crítico. Marca ✓ conforme revisa. Lista reseta a cada dia.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {critical.length === 0 ? (
            <div className="py-12 text-center">
              <Check className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <p className="text-lg font-medium text-green-700">Tudo sob controle!</p>
              <p className="text-sm text-muted-foreground mt-1">Nenhum cliente em estado crítico ou atenção agora.</p>
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">🎯 Pendente de revisão</p>
                  <div className="space-y-2">
                    {pending.map(r => (
                      <TriageCard key={r.client_id + r.ad_account_id} row={r} reviewed={false} onToggle={() => markReviewed(r)} onOpen={() => onOpenDetails?.(r)} />
                    ))}
                  </div>
                </section>
              )}
              {done.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">✓ Revisados hoje</p>
                  <div className="space-y-2 opacity-60">
                    {done.map(r => (
                      <TriageCard key={r.client_id + r.ad_account_id} row={r} reviewed={true} onToggle={() => markReviewed(r)} onOpen={() => onOpenDetails?.(r)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TriageCard({ row, reviewed, onToggle, onOpen }: {
  row: ClientMonitoringRow; reviewed: boolean; onToggle: () => void; onOpen: () => void;
}) {
  const color = row.health === 'red' ? 'border-red-500/50' : 'border-amber-500/50';
  return (
    <div className={cn('flex items-center gap-3 p-3 bg-card border rounded-md', color, reviewed && 'bg-muted/20')}>
      <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0',
        row.health === 'red' ? 'bg-red-500' : 'bg-amber-500'
      )} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{row.client_name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {row.current.whatsapp_conversations > 0 ? `${fmtInt(row.current.whatsapp_conversations)} conversas · ${fmtBRL(row.current.cost_per_conversation)}/conv` : 'Sem conversas no período'}
          {row.balance.runway_days !== null && row.balance.runway_days <= 7 && ` · Saldo ${Math.round(row.balance.runway_days)}d`}
        </p>
      </div>
      <Button size="sm" variant="ghost" className="h-8" onClick={onOpen} title="Ver detalhes">
        <Eye className="h-3.5 w-3.5 mr-1" />Ver
      </Button>
      <Button
        size="sm"
        variant={reviewed ? 'secondary' : 'default'}
        className="h-8"
        onClick={onToggle}
      >
        <Check className="h-3.5 w-3.5 mr-1" />
        {reviewed ? 'Desmarcar' : 'Revisado'}
      </Button>
    </div>
  );
}
