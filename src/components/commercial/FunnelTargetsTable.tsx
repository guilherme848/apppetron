import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Plus } from 'lucide-react';
import { SalesFunnelTarget, formatCurrency, formatPercent, formatNumber, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { FunnelTargetModal } from './FunnelTargetModal';
import { parseISO, setMonth, setYear } from 'date-fns';

interface Props {
  targets: SalesFunnelTarget[];
  year: number;
  canEdit: boolean;
  onSave: (month: Date, data: Partial<SalesFunnelTarget>) => Promise<boolean>;
}

// Define metrics rows configuration
const METRICS_CONFIG = [
  { key: 'investment_target', label: 'Investimento', format: formatCurrency },
  { key: 'leads_target', label: 'Leads', format: formatNumber },
  { key: 'cpl_target', label: 'CPL', format: formatCurrency },
  { key: 'rate_scheduling_target', label: 'Tx Agend.', format: formatPercent },
  { key: 'appointments_target', label: 'Agendamentos', format: formatNumber },
  { key: 'rate_attendance_target', label: 'Tx Comp.', format: formatPercent },
  { key: 'meetings_held_target', label: 'Reuniões', format: formatNumber },
  { key: 'rate_close_target', label: 'Tx Conv.', format: formatPercent },
  { key: 'sales_target', label: 'Vendas', format: formatNumber },
  { key: 'avg_ticket_target', label: 'Ticket Médio', format: formatCurrency },
  { key: 'revenue_target', label: 'Receita', format: formatCurrency },
  { key: 'roas_target', label: 'ROAS', format: formatRoas },
] as const;

// Short month names for column headers
const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function FunnelTargetsTable({ targets, year, canEdit, onSave }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<SalesFunnelTarget | undefined>();

  const handleEdit = (monthIndex: number) => {
    const monthDate = setMonth(setYear(new Date(), year), monthIndex);
    const existingTarget = targets.find(t => {
      const tMonth = parseISO(t.month);
      return tMonth.getMonth() === monthIndex && tMonth.getFullYear() === year;
    });
    
    setSelectedMonth(monthDate);
    setSelectedTarget(existingTarget);
    setModalOpen(true);
  };

  const getTargetForMonth = (monthIndex: number): SalesFunnelTarget | undefined => {
    return targets.find(t => {
      const tMonth = parseISO(t.month);
      return tMonth.getMonth() === monthIndex && tMonth.getFullYear() === year;
    });
  };

  // Mobile card view
  const MobileView = () => (
    <div className="space-y-4 md:hidden">
      {Array.from({ length: 12 }, (_, i) => {
        const target = getTargetForMonth(i);
        return (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{MONTH_NAMES[i]}</CardTitle>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(i)}>
                    {target ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {target ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Investimento:</span>
                    <span className="ml-1 font-medium">{formatCurrency(target.investment_target)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leads:</span>
                    <span className="ml-1 font-medium">{formatNumber(target.leads_target)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPL:</span>
                    <span className="ml-1 font-medium">{formatCurrency(target.cpl_target)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendas:</span>
                    <span className="ml-1 font-medium">{formatNumber(target.sales_target)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Receita:</span>
                    <span className="ml-1 font-medium">{formatCurrency(target.revenue_target)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ROAS:</span>
                    <span className="ml-1 font-medium">{formatRoas(target.roas_target)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhuma meta definida</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Desktop table view - inverted: metrics as rows, months as columns
  const DesktopView = () => (
    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background min-w-[120px]">Métrica</TableHead>
            {SHORT_MONTHS.map((month, i) => (
              <TableHead key={i} className="text-center min-w-[80px]">
                <div className="flex flex-col items-center gap-1">
                  <span>{month}</span>
                  {canEdit && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => handleEdit(i)}
                    >
                      {getTargetForMonth(i) ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {METRICS_CONFIG.map((metric) => (
            <TableRow key={metric.key}>
              <TableCell className="sticky left-0 bg-background font-medium">
                {metric.label}
              </TableCell>
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const target = getTargetForMonth(monthIndex);
                const value = target ? target[metric.key as keyof SalesFunnelTarget] : null;
                return (
                  <TableCell key={monthIndex} className="text-center">
                    {metric.format(value as number | null)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <MobileView />
      <DesktopView />
      
      {selectedMonth && (
        <FunnelTargetModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          month={selectedMonth}
          target={selectedTarget}
          onSave={onSave}
        />
      )}
    </>
  );
}
