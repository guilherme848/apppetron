import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Plus } from 'lucide-react';
import { SalesFunnelTarget, formatCurrency, formatPercent, formatNumber, formatRoas, MONTH_NAMES } from '@/types/salesFunnel';
import { FunnelTargetModal } from './FunnelTargetModal';
import { format, parseISO, startOfMonth, setMonth, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  targets: SalesFunnelTarget[];
  year: number;
  canEdit: boolean;
  onSave: (month: Date, data: Partial<SalesFunnelTarget>) => Promise<boolean>;
}

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
            const target = getTargetForMonth(i);
            return (
              <TableRow key={i}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  {MONTH_NAMES[i]}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(target?.investment_target)}</TableCell>
                <TableCell className="text-right">{formatNumber(target?.leads_target)}</TableCell>
                <TableCell className="text-right">{formatCurrency(target?.cpl_target)}</TableCell>
                <TableCell className="text-right">{formatPercent(target?.rate_scheduling_target)}</TableCell>
                <TableCell className="text-right">{formatNumber(target?.appointments_target)}</TableCell>
                <TableCell className="text-right">{formatPercent(target?.rate_attendance_target)}</TableCell>
                <TableCell className="text-right">{formatNumber(target?.meetings_held_target)}</TableCell>
                <TableCell className="text-right">{formatPercent(target?.rate_close_target)}</TableCell>
                <TableCell className="text-right">{formatNumber(target?.sales_target)}</TableCell>
                <TableCell className="text-right">{formatCurrency(target?.avg_ticket_target)}</TableCell>
                <TableCell className="text-right">{formatCurrency(target?.revenue_target)}</TableCell>
                <TableCell className="text-right">{formatRoas(target?.roas_target)}</TableCell>
                {canEdit && (
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(i)}>
                      {target ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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
