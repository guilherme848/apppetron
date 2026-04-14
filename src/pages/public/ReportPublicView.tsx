import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: number) {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

export default function ReportPublicView() {
  const { token } = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase
        .from('matcon_reports')
        .select('*')
        .eq('share_token', token)
        .single();
      if (error || !data) {
        setError('Relatório não encontrado.');
        setLoading(false);
        return;
      }
      setReport(data);
      setLoading(false);
      // Track view
      supabase.rpc('track_report_view', { p_share_token: token }).catch(() => {});
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">{error || 'Relatório indisponível.'}</p>
      </div>
    );
  }

  const d = report.report_data;
  const narrative = report.narrative;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="bg-card rounded-2xl shadow-lg border overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 md:p-8 text-center border-b">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Relatório Semanal</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{d.client_name}</h1>
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(report.period_start), "dd 'de' MMMM", { locale: ptBR })} a {format(new Date(report.period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-3">Agência Petron · Performance em Tráfego Pago</p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Abertura */}
            {narrative?.summary && (
              <div className="text-center py-4 px-4 bg-primary/5 rounded-lg">
                <p className="text-base md:text-lg italic text-foreground/90">"{narrative.summary}"</p>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard icon="💬" label="Conversas WhatsApp" value={fmtInt(d.current.conversations)} delta={d.deltas.conversations} />
              <KPICard icon="💰" label="Custo por conversa" value={d.current.conversations > 0 ? fmtBRL(d.current.cost_per_conversation) : '—'} delta={d.deltas.cost_per_conversation} invertDelta />
              <KPICard icon="📣" label="Alcance" value={fmtInt(d.current.reach)} delta={d.deltas.reach} />
              <KPICard icon="📊" label="Investimento" value={fmtBRL(d.current.spend)} />
            </div>

            {/* Highlights narrativos */}
            {narrative?.highlights && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">O que aconteceu</h2>
                {narrative.highlights.map((h: any, i: number) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-lg">
                    <p className="font-semibold text-sm md:text-base mb-1">{h.title}</p>
                    <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{h.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Próximos Passos */}
            {report.next_steps && report.next_steps.length > 0 && (
              <div className="p-5 bg-primary/5 rounded-lg border border-primary/20">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  🎯 Próximos passos
                </h2>
                <ul className="space-y-2">
                  {report.next_steps.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm md:text-base">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detalhes expansíveis */}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-2">Ver métricas detalhadas</summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 bg-muted/30 rounded">
                <DetailRow label="Impressões" value={fmtInt(d.current.impressions)} />
                <DetailRow label="Alcance único" value={fmtInt(d.current.reach)} />
                <DetailRow label="Cliques" value={fmtInt(d.current.clicks)} />
                <DetailRow label="Visitas no perfil" value={fmtInt(d.current.profile_visits)} />
                <DetailRow label="Custo por 1.000 impressões" value={fmtBRL(d.current.cpm)} />
                <DetailRow label="Taxa clique único" value={fmtPct(d.current.unique_ctr)} />
                <DetailRow label="Conversão clique→conversa" value={fmtPct(d.current.conversion_rate)} />
                <DetailRow label="Frequência média" value={d.current.frequency_avg.toFixed(1)} />
              </div>
            </details>

            <p className="text-center text-[10px] text-muted-foreground pt-4 border-t">
              Gerado em {format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} · Dúvidas? Fale com a Petron no WhatsApp.
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Este relatório é exclusivo para {d.client_name}. Powered by Agência Petron.
        </p>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, delta, invertDelta = false }: {
  icon: string; label: string; value: string; delta?: number; invertDelta?: boolean;
}) {
  const hasDelta = typeof delta === 'number' && Math.abs(delta) > 0.5;
  const good = hasDelta ? (invertDelta ? delta! < 0 : delta! > 0) : false;
  return (
    <div className="p-4 bg-card border rounded-lg text-center shadow-sm">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold">{value}</p>
      {hasDelta && (
        <p className={cn('text-[11px] font-medium mt-1', good ? 'text-green-600' : 'text-amber-600')}>
          {delta! > 0 ? '+' : ''}{delta!.toFixed(0)}% vs. semana anterior
        </p>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
