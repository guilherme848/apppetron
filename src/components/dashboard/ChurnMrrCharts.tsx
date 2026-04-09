import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrm } from '@/contexts/CrmContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingDown, DollarSign } from 'lucide-react';
import { parseISO, isValid, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface MonthData {
  month: string;
  label: string;
  churnedCount: number;
  activeStartCount: number;
  churnRate: number;
  mrr: number;
  activeCount: number;
}

const formatMonthLabel = (monthRef: string) => {
  const [year, month] = monthRef.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function ChurnMrrCharts() {
  const { accounts } = useCrm();

  const monthlyData = useMemo(() => {
    const now = new Date();
    const data: MonthData[] = [];

    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const firstDay = startOfMonth(monthDate);
      const lastDay = endOfMonth(monthDate);
      const monthRef = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}`;

      // Churned count: clients with churned_at in this month
      const churnedCount = accounts.filter(a => {
        if (!a.churned_at) return false;
        const churnDate = parseISO(a.churned_at);
        if (!isValid(churnDate)) return false;
        return churnDate >= firstDay && churnDate <= lastDay;
      }).length;

      // Active at start of month: clients who had start_date <= first day AND (no churned_at OR churned_at > first day)
      const activeStartCount = accounts.filter(a => {
        if (!a.start_date) return false;
        const startDate = parseISO(a.start_date);
        if (!isValid(startDate) || startDate > firstDay) return false;
        if (!a.churned_at) return true;
        const churnDate = parseISO(a.churned_at);
        return !isValid(churnDate) || churnDate > firstDay;
      }).length;

      // Churn rate
      const churnRate = activeStartCount > 0 ? (churnedCount / activeStartCount) * 100 : 0;

      // MRR at end of month: clients active at that point
      let mrr = 0;
      let activeCount = 0;
      accounts.forEach(a => {
        if (!a.start_date) return;
        const startDate = parseISO(a.start_date);
        if (!isValid(startDate) || startDate > lastDay) return;
        if (a.churned_at) {
          const churnDate = parseISO(a.churned_at);
          if (isValid(churnDate) && churnDate <= lastDay) return;
        }
        mrr += Number(a.monthly_value || 0);
        activeCount++;
      });

      data.push({
        month: monthRef,
        label: formatMonthLabel(monthRef),
        churnedCount,
        activeStartCount,
        churnRate: Math.round(churnRate * 10) / 10,
        mrr,
        activeCount,
      });
    }

    return data;
  }, [accounts]);

  const currentMonthData = monthlyData[monthlyData.length - 1];
  const previousMonthData = monthlyData[monthlyData.length - 2];
  const netMrrChange = currentMonthData && previousMonthData 
    ? currentMonthData.mrr - previousMonthData.mrr 
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Month Churn Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Mensal (Atual)</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonthData?.churnRate.toFixed(1).replace('.', ',')}%
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMonthData?.churnedCount} / {currentMonthData?.activeStartCount} clientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variação Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netMrrChange >= 0 ? 'text-success' : 'text-destructive'}`}>
              {netMrrChange >= 0 ? '+' : ''}{formatCurrency(netMrrChange)}
            </div>
            <p className="text-xs text-muted-foreground">
              vs. mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Churn Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Churn Rate (Últimos 12 meses)</CardTitle>
          <CardDescription>Taxa de cancelamento mensal</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Sem dados de churn disponíveis
            </p>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'churnRate') return [`${value.toFixed(1).replace('.', ',')}%`, 'Churn Rate'];
                      if (name === 'churnedCount') return [value, 'Cancelados'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => label}
                  />
                  <Bar 
                    dataKey="churnRate" 
                    fill="hsl(var(--destructive))" 
                    radius={[4, 4, 0, 0]}
                    name="churnRate"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Churned Count Chart (context) */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Cancelados (Últimos 12 meses)</CardTitle>
          <CardDescription>Quantidade de cancelamentos por mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value: number) => [value, 'Cancelados']}
                  labelFormatter={(label) => label}
                />
                <Bar 
                  dataKey="churnedCount" 
                  fill="hsl(var(--muted-foreground))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* MRR Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Receita Mensal (Últimos 12 meses)</CardTitle>
          <CardDescription>Baseado no valor mensal de clientes ativos em cada mês</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Sem dados de MRR disponíveis
            </p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'MRR']}
                    labelFormatter={(label) => label}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mrr" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}