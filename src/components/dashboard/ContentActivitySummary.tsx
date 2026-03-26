import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BATCH_STATUS_OPTIONS, BatchStatus } from '@/types/contentProduction';

interface StageCount {
  status: string;
  count: number;
}

interface OpenPost {
  id: string;
  title: string;
  client_name: string;
}

export function ContentActivitySummary() {
  const [loading, setLoading] = useState(true);
  const [stageCounts, setStageCounts] = useState<StageCount[]>([]);
  const [openPostsCount, setOpenPostsCount] = useState(0);
  const [overdueBatchesCount, setOverdueBatchesCount] = useState(0);
  const [topTodoPosts, setTopTodoPosts] = useState<OpenPost[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Get current month reference (YYYY-MM)
    const now = new Date();
    const currentMonthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];

    // 1. Count batches by status (non-archived)
    const { data: batchesByStatus } = await supabase
      .from('content_batches')
      .select('status')
      .eq('archived', false);

    if (batchesByStatus) {
      const counts: Record<string, number> = {};
      batchesByStatus.forEach(b => {
        counts[b.status] = (counts[b.status] || 0) + 1;
      });
      setStageCounts(Object.entries(counts).map(([status, count]) => ({ status, count })));
    }

    // 2. Open posts in current month
    const { data: batchesThisMonth } = await supabase
      .from('content_batches')
      .select('id')
      .eq('month_ref', currentMonthRef)
      .eq('archived', false);

    if (batchesThisMonth && batchesThisMonth.length > 0) {
      const batchIds = batchesThisMonth.map(b => b.id);
      const { count } = await supabase
        .from('content_posts')
        .select('*', { count: 'exact', head: true })
        .in('batch_id', batchIds)
        .neq('status', 'done')
        .or('archived.is.null,archived.eq.false');
      
      setOpenPostsCount(count || 0);
    }

    // 3. Overdue batches
    const { count: overdueCount } = await supabase
      .from('content_batches')
      .select('*', { count: 'exact', head: true })
      .eq('archived', false)
      .lt('planning_due_date', today)
      .not('planning_due_date', 'is', null);

    setOverdueBatchesCount(overdueCount || 0);

    // 4. Top 10 todo posts from current month with client names
    const { data: todoPosts } = await supabase
      .from('content_posts')
      .select(`
        id,
        title,
        batch_id,
        content_batches!inner (
          month_ref,
          client_id,
          archived,
          accounts (
            name
          )
        )
      `)
      .eq('status', 'todo')
      .eq('content_batches.archived', false)
      .eq('content_batches.month_ref', currentMonthRef)
      .limit(10);

    if (todoPosts) {
      setTopTodoPosts(todoPosts.map((p: any) => ({
        id: p.id,
        title: p.title || 'Sem título',
        client_name: p.content_batches?.accounts?.name || 'Sem cliente',
      })));
    }

    setLoading(false);
  };

  const getStatusLabel = (status: string) => {
    return BATCH_STATUS_OPTIONS.find(s => s.value === status)?.label || status;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resumo das Atividades (Conteúdo)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stage counts */}
        <div>
          <h4 className="text-sm font-medium mb-2">Planejamentos por Etapa</h4>
          <div className="flex flex-wrap gap-2">
            {BATCH_STATUS_OPTIONS.map(status => {
              const count = stageCounts.find(s => s.status === status.value)?.count || 0;
              if (count === 0) return null;
              return (
                <Badge key={status.value} variant="outline" className="text-xs">
                  {status.label}: {count}
                </Badge>
              );
            })}
            {stageCounts.length === 0 && (
              <span className="text-sm text-muted-foreground">Nenhum planejamento ativo</span>
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Posts em aberto (mês atual)
            </div>
            <p className="text-2xl font-bold">{openPostsCount}</p>
          </div>
          <div className={`p-3 rounded-lg ${overdueBatchesCount > 0 ? 'bg-destructive/10' : 'bg-muted/50'}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className={`h-4 w-4 ${overdueBatchesCount > 0 ? 'text-destructive' : ''}`} />
              Planejamentos atrasados
            </div>
            <p className={`text-2xl font-bold ${overdueBatchesCount > 0 ? 'text-destructive' : ''}`}>
              {overdueBatchesCount}
            </p>
          </div>
        </div>

        {/* Top 10 todo posts */}
        {topTodoPosts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Top 10 Posts "A Fazer" (mês atual)</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {topTodoPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground truncate flex-shrink-0 w-28">
                    {post.client_name}
                  </span>
                  <span className="truncate">{post.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
