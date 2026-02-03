import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Plus } from 'lucide-react';
import { SalesFunnelActual, formatCurrency, formatPercent, formatNumber, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { FunnelActualModal } from './FunnelActualModal';
import { parseISO, setMonth, setYear } from 'date-fns';

interface Props {
  actuals: SalesFunnelActual[];
  year: number;
  canEdit: boolean;
  onSave: (month: Date, data: Partial<SalesFunnelActual>) => Promise<boolean>;
}

// Define metrics rows configuration - rates after their source data
const METRICS_CONFIG: { key: string; label: string; format: (v: number | null) => string; computed?: boolean }[] = [
  { key: 'investment_actual', label: 'Investimento', format: formatCurrency },
  { key: 'leads_actual', label: 'Leads', format: formatNumber },
  { key: 'cpl_actual', label: 'CPL', format: formatCurrency, computed: true },
  { key: 'appointments_actual', label: 'Agendamentos', format: formatNumber },
  { key: 'rate_scheduling_actual', label: 'Tx Agend.', format: formatPercent, computed: true },
  { key: 'meetings_held_actual', label: 'Reuniões', format: formatNumber },
  { key: 'rate_attendance_actual', label: 'Tx Comp.', format: formatPercent, computed: true },
  { key: 'cost_per_attendance_actual', label: 'Custo/Comp.', format: formatCurrency, computed: true },
  { key: 'sales_actual', label: 'Vendas', format: formatNumber },
  { key: 'rate_close_actual', label: 'Tx Conv.', format: formatPercent, computed: true },
  { key: 'cost_per_sale_actual', label: 'CAC', format: formatCurrency, computed: true },
  { key: 'avg_ticket_actual', label: 'Ticket Médio', format: formatCurrency },
  { key: 'revenue_actual', label: 'Receita', format: formatCurrency },
  { key: 'roas_actual', label: 'ROAS', format: formatRoas, computed: true },
];

// Short month names for column headers
const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function FunnelActualsTable({ actuals, year, canEdit, onSave }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [selectedActual, setSelectedActual] = useState<SalesFunnelActual | undefined>();

  const handleEdit = (monthIndex: number) => {
    const monthDate = setMonth(setYear(new Date(), year), monthIndex);
    const existingActual = actuals.find(a => {
      const aMonth = parseISO(a.month);
      return aMonth.getMonth() === monthIndex && aMonth.getFullYear() === year;
    });
    
    setSelectedMonth(monthDate);
    setSelectedActual(existingActual);
    setModalOpen(true);
  };

  const getActualForMonth = (monthIndex: number): SalesFunnelActual | undefined => {
    return actuals.find(a => {
      const aMonth = parseISO(a.month);
      return aMonth.getMonth() === monthIndex && aMonth.getFullYear() === year;
    });
  };

  // Calculate derived rates for a given actual
  const getComputedValue = (actual: SalesFunnelActual | undefined, key: string): number | null => {
    if (!actual) return null;
    
    switch (key) {
      case 'cpl_actual':
        return actual.investment_actual && actual.leads_actual
          ? actual.investment_actual / actual.leads_actual
          : null;
      case 'rate_scheduling_actual':
        return actual.leads_actual && actual.appointments_actual
          ? actual.appointments_actual / actual.leads_actual
          : null;
      case 'rate_attendance_actual':
        return actual.appointments_actual && actual.meetings_held_actual
          ? actual.meetings_held_actual / actual.appointments_actual
          : null;
      case 'cost_per_attendance_actual':
        return actual.investment_actual && actual.meetings_held_actual
          ? actual.investment_actual / actual.meetings_held_actual
          : null;
      case 'rate_close_actual':
        return actual.meetings_held_actual && actual.sales_actual
          ? actual.sales_actual / actual.meetings_held_actual
          : null;
      case 'cost_per_sale_actual':
        return actual.investment_actual && actual.sales_actual
          ? actual.investment_actual / actual.sales_actual
          : null;
      case 'roas_actual':
        return actual.revenue_actual && actual.investment_actual
          ? actual.revenue_actual / actual.investment_actual
          : null;
      default:
        return actual[key as keyof SalesFunnelActual] as number | null;
    }
  };

  // Mobile card view - keep as before
  const MobileView = () => (
    <div className="space-y-4 md:hidden">
      {Array.from({ length: 12 }, (_, i) => {
        const actual = getActualForMonth(i);
        return (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{MONTH_NAMES[i]}</CardTitle>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(i)}>
                    {actual ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {actual ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Investimento:</span>
                    <span className="ml-1 font-medium">{formatCurrency(actual.investment_actual)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leads:</span>
                    <span className="ml-1 font-medium">{formatNumber(actual.leads_actual)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPL:</span>
                    <span className="ml-1 font-medium">{formatCurrency(actual.cpl_actual)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vendas:</span>
                    <span className="ml-1 font-medium">{formatNumber(actual.sales_actual)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Receita:</span>
                    <span className="ml-1 font-medium">{formatCurrency(actual.revenue_actual)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ROAS:</span>
                    <span className="ml-1 font-medium">{formatRoas(actual.roas_actual)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhum dado registrado</p>
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
                      {getActualForMonth(i) ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
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
                const actual = getActualForMonth(monthIndex);
                const value = metric.computed 
                  ? getComputedValue(actual, metric.key)
                  : (actual ? actual[metric.key as keyof SalesFunnelActual] as number | null : null);
                return (
                  <TableCell key={monthIndex} className="text-center">
                    {metric.format(value)}
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
        <FunnelActualModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          month={selectedMonth}
          actual={selectedActual}
          onSave={onSave}
        />
      )}
    </>
  );
}
