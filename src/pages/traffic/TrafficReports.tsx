import { useState } from 'react';
import { FileText, Send, Eye, RefreshCw, Sparkles, Clock, Check, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMatconReports, type MatconClientReportRow, type MatconReport } from '@/hooks/useMatconReports';

function getReportUrl(token: string) {
  return `${window.location.origin}/r/${token}`;
}

function onlyDigits(s: string | null | undefined) {
  return (s || '').replace(/\D/g, '');
}

function buildWhatsAppMessage(row: MatconClientReportRow, report: MatconReport): string {
  const d = report.report_data;
  const link = getReportUrl(report.share_token);
  const conv = d.current.conversations;
  const cpc = d.current.cost_per_conversation;
  const firstName = row.client_name.split(' ')[0];
  return [
    `Olá${firstName ? `, ${firstName}` : ''}! 👋`,
    '',
    `Está disponível o seu relatório semanal da Petron.`,
    '',
    conv > 0 ? `💬 Foram *${conv}* conversas no WhatsApp nesta semana${cpc > 0 ? ` a R$ ${cpc.toFixed(2)} cada` : ''}.` : '✨ Esta semana ajustamos as campanhas para trazer ainda mais contatos.',
    '',
    `📊 Ver o relatório completo:`,
    link,
    '',
    `Qualquer dúvida é só responder aqui. Bom trabalho! 💪`,
  ].join('\n');
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: number) {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

function StatusBadge({ report }: { report: MatconReport | null }) {
  if (!report) return <Badge variant="outline" className="text-[10px]">Sem relatório</Badge>;
  if (report.status === 'sent' || report.status === 'viewed') {
    return <Badge className="text-[10px] bg-green-500/20 text-green-700 border-green-500/30">Enviado</Badge>;
  }
  if (report.status === 'generated') {
    return <Badge variant="secondary" className="text-[10px]">Gerado (não enviado)</Badge>;
  }
  if (report.status === 'failed') {
    return <Badge variant="destructive" className="text-[10px]">Falhou</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">Rascunho</Badge>;
}

function ReportPreviewDialog({ report, row, open, onOpenChange, onSendWhatsApp }: {
  report: MatconReport | null;
  row: MatconClientReportRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSendWhatsApp: () => void;
}) {
  if (!report || !row) return null;
  const clientName = row.client_name;
  const d = report.report_data;
  const publicUrl = getReportUrl(report.share_token);
  const phone = onlyDigits(row.contact_phone);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório · {clientName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {format(new Date(report.period_start), "dd 'de' MMMM", { locale: ptBR })} a {format(new Date(report.period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </DialogHeader>

        {/* Preview estilo relatório */}
        <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-lg p-6 space-y-6 border">
          {/* Cabeçalho */}
          <div className="text-center space-y-1 pb-4 border-b">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Relatório Semanal</p>
            <h2 className="text-2xl font-bold">{clientName}</h2>
            <p className="text-xs text-muted-foreground">Agência Petron · Performance de Tráfego Pago</p>
          </div>

          {/* Abertura */}
          {report.narrative?.summary && (
            <div className="text-center px-4 py-3">
              <p className="text-base italic text-foreground/90">"{report.narrative.summary}"</p>
            </div>
          )}

          {/* KPIs principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard icon="💬" label="Conversas WhatsApp" value={fmtInt(d.current.conversations)} delta={d.deltas.conversations} />
            <KPICard icon="💰" label="Custo por conversa" value={d.current.conversations > 0 ? fmtBRL(d.current.cost_per_conversation) : '—'} delta={d.deltas.cost_per_conversation} invertDelta />
            <KPICard icon="📣" label="Alcance" value={fmtInt(d.current.reach)} delta={d.deltas.reach} />
            <KPICard icon="👥" label="Investimento" value={fmtBRL(d.current.spend)} />
          </div>

          {/* Highlights narrativos */}
          {report.narrative?.highlights && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">O que aconteceu</p>
              {report.narrative.highlights.map((h, i) => (
                <div key={i} className="p-3 bg-card border rounded-md">
                  <p className="font-semibold text-sm mb-1">{h.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{h.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Próximos passos */}
          {report.next_steps && report.next_steps.length > 0 && (
            <div className="space-y-2 p-4 bg-primary/5 rounded-md border border-primary/20">
              <p className="text-sm font-semibold flex items-center gap-2">🎯 Próximos Passos</p>
              <ul className="space-y-1.5">
                {report.next_steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detalhes expandíveis */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver métricas detalhadas</summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
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

          <p className="text-center text-[10px] text-muted-foreground pt-3 border-t">
            Gerado em {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
            <LinkIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <code className="flex-1 truncate">{publicUrl}</code>
            <Button
              size="sm" variant="ghost" className="h-7 px-2"
              onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Link copiado'); }}
            >
              Copiar
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!phone}
              onClick={onSendWhatsApp}
              title={phone ? `Enviar para ${phone}` : 'Cliente sem telefone'}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {phone ? 'Enviar WhatsApp' : 'Sem telefone'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KPICard({ icon, label, value, delta, invertDelta = false }: {
  icon: string; label: string; value: string; delta?: number; invertDelta?: boolean;
}) {
  const hasDelta = typeof delta === 'number' && Math.abs(delta) > 0.5;
  const good = hasDelta ? (invertDelta ? delta! < 0 : delta! > 0) : false;
  return (
    <div className="p-3 bg-card border rounded-md text-center">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hasDelta && (
        <p className={cn('text-[10px] font-medium mt-0.5', good ? 'text-green-600' : 'text-amber-600')}>
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

function ClientReportCard({ row, onGenerate, onPreview, generating, onSendWhatsApp }: {
  row: MatconClientReportRow;
  onGenerate: () => void;
  onPreview: () => void;
  generating: boolean;
  onSendWhatsApp: () => void;
}) {
  const r = row.last_report;
  const phone = onlyDigits(row.contact_phone);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm truncate">{row.client_name}</CardTitle>
            {row.ad_monthly_budget != null && (
              <p className="text-[10px] text-muted-foreground">Verba: {fmtBRL(row.ad_monthly_budget)}/mês</p>
            )}
          </div>
          <StatusBadge report={r} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {r ? (
          <div className="text-xs space-y-1">
            <p className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Último: {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
            </p>
            <p className="text-muted-foreground">
              {format(new Date(r.period_start), 'dd/MM')} – {format(new Date(r.period_end), 'dd/MM')}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum relatório gerado ainda.</p>
        )}
        <div className="flex gap-1 flex-wrap">
          {r && (
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs min-w-[80px]" onClick={onPreview}>
              <Eye className="h-3 w-3 mr-1" />Ver
            </Button>
          )}
          <Button size="sm" className="flex-1 h-8 text-xs min-w-[80px]" onClick={onGenerate} disabled={generating}>
            {generating ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            {r ? 'Regenerar' : 'Gerar'}
          </Button>
        </div>
        {r && (
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
            onClick={onSendWhatsApp}
            disabled={!phone}
            title={phone ? `Enviar para ${phone}` : 'Cliente sem telefone cadastrado'}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            {phone ? 'Enviar WhatsApp' : 'Sem telefone'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrafficReports() {
  const { rows, loading, generate, markAsSent } = useMatconReports();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<MatconClientReportRow | null>(null);

  const handleGenerate = async (row: MatconClientReportRow) => {
    setGeneratingId(row.client_id);
    try {
      await generate(row.client_id);
      toast.success(`Relatório gerado para ${row.client_name}`);
    } catch (e: any) {
      toast.error(`Erro: ${e?.message || 'falha desconhecida'}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSendWhatsApp = async (row: MatconClientReportRow) => {
    if (!row.last_report || !row.contact_phone) return;
    const phone = onlyDigits(row.contact_phone);
    if (!phone) { toast.error('Cliente sem telefone válido'); return; }
    const msg = buildWhatsAppMessage(row, row.last_report);
    const url = `https://wa.me/${phone.length === 11 ? '55' + phone : phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    await markAsSent(row.last_report.id, 'whatsapp', phone);
    toast.success('WhatsApp aberto — clique em enviar lá. Status marcado como enviado.');
  };

  const withReport = rows.filter(r => r.last_report).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios Semanais</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Relatórios automáticos para clientes MatCon. Narrativa gerada por IA em tom positivo e linguagem simples.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Clientes MatCon</p><p className="text-xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Com relatório gerado</p><p className="text-xl font-bold">{withReport}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-xl font-bold">{rows.length - withReport}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Enviados</p><p className="text-xl font-bold">{rows.filter(r => r.last_report?.status === 'sent' || r.last_report?.status === 'viewed').length}</p></CardContent></Card>
      </div>

      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum cliente MatCon com conta Meta vinculada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map((row) => (
            <ClientReportCard
              key={row.client_id}
              row={row}
              generating={generatingId === row.client_id}
              onGenerate={() => handleGenerate(row)}
              onPreview={() => setPreviewing(row)}
              onSendWhatsApp={() => handleSendWhatsApp(row)}
            />
          ))}
        </div>
      )}

      <ReportPreviewDialog
        report={previewing?.last_report ?? null}
        row={previewing}
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
        onSendWhatsApp={() => previewing && handleSendWhatsApp(previewing)}
      />
    </div>
  );
}
