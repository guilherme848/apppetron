import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Plus } from 'lucide-react';
import { SalesFunnelActual, formatCurrency, formatPercent, formatNumber, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { FunnelActualModal } from './FunnelActualModal';
import { format, parseISO, startOfMonth, setMonth, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  actuals: SalesFunnelActual[];
  year: number;
  canEdit: boolean;
  onSave: (month: Date, data: Partial<SalesFunnelActual>) => Promise<boolean>;
}

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

  // Calculate derived rates
  const getRates = (actual: SalesFunnelActual | undefined) => {
    if (!actual) return { scheduling: null, attendance: null, close: null };
    
    const scheduling = actual.leads_actual && actual.appointments_actual
      ? actual.appointments_actual / actual.leads_actual
      : null;
    const attendance = actual.appointments_actual && actual.meetings_held_actual
      ? actual.meetings_held_actual / actual.appointments_actual
      : null;
    const close = actual.meetings_held_actual && actual.sales_actual
      ? actual.sales_actual / actual.meetings_held_actual
      : null;
    
    return { scheduling, attendance, close };
  };

  // Mobile card view
  const MobileView = () => (
    <div className="space-y-4 md:hidden">
      {Array.from({ length: 12 }, (_, i) => {
        const actual = getActualForMonth(i);
        const rates = getRates(actual);
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

  // Desktop table view
  const DesktopView = () => (
    <div className="hidden md:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background">Mês</TableHead>
            <TableHead className="text-right">Investimento</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right">Tx Agend.</TableHead>
            <TableHead className="text-right">Agend.</TableHead>
            <TableHead className="text-right">Tx Comp.</TableHead>
            <TableHead className="text-right">Reuniões</TableHead>
            <TableHead className="text-right">Tx Conv.</TableHead>
            <TableHead className="text-right">Vendas</TableHead>
            <TableHead className="text-right">TKM</TableHead>
            <TableHead className="text-right">Receita</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            {canEdit && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 12 }, (_, i) => {
            const actual = getActualForMonth(i);
            const rates = getRates(actual);
            return (
              <TableRow key={i}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  {MONTH_NAMES[i]}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(actual?.investment_actual)}</TableCell>
                <TableCell className="text-right">{formatNumber(actual?.leads_actual)}</TableCell>
                <TableCell className="text-right">{formatCurrency(actual?.cpl_actual)}</TableCell>
                <TableCell className="text-right">{formatPercent(rates.scheduling)}</TableCell>
                <TableCell className="text-right">{formatNumber(actual?.appointments_actual)}</TableCell>
                <TableCell className="text-right">{formatPercent(rates.attendance)}</TableCell>
                <TableCell className="text-right">{formatNumber(actual?.meetings_held_actual)}</TableCell>
                <TableCell className="text-right">{formatPercent(rates.close)}</TableCell>
                <TableCell className="text-right">{formatNumber(actual?.sales_actual)}</TableCell>
                <TableCell className="text-right">{formatCurrency(actual?.avg_ticket_actual)}</TableCell>
                <TableCell className="text-right">{formatCurrency(actual?.revenue_actual)}</TableCell>
                <TableCell className="text-right">{formatRoas(actual?.roas_actual)}</TableCell>
                {canEdit && (
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(i)}>
                      {actual ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
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
