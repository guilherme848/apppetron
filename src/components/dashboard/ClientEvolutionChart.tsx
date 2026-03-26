import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthData {
  month: string;
  label: string;
  count: number;
}

export function ClientEvolutionChart() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthData[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Get all active accounts with start_date
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, start_date, created_at')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching accounts:', error);
      setLoading(false);
      return;
    }

    // Generate last 12 months
    const months: MonthData[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      months.push({
        month: monthKey,
        label: `${monthNames[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`,
        count: 0,
      });
    }

    // Count new clients per month using start_date (or created_at as fallback)
    if (accounts) {
      accounts.forEach(account => {
        const dateStr = account.start_date || account.created_at;
        if (dateStr) {
          const date = new Date(dateStr);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthData = months.find(m => m.month === monthKey);
          if (monthData) {
            monthData.count++;
          }
        }
      });
    }

    setData(months);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Skeleton className="h-24 w-full rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução de Clientes (Mês a Mês)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Sem dados de novos clientes nos últimos 12 meses
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 11 }} 
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value} cliente(s)`, 'Novos']}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
