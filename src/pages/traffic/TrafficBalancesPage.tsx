import { useState, useMemo } from 'react';
import { DollarSign, RefreshCw, AlertTriangle, TrendingDown, Clock, RotateCw, LinkIcon, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMetaAds } from '@/hooks/useMetaAds';
import { useCrm } from '@/contexts/CrmContext';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { AdPaymentMethod, AdPaymentFrequency } from '@/types/crm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PAYMENT_METHOD_LABELS: Record<AdPaymentMethod, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
};

const PAYMENT_FREQUENCY_LABELS: Record<AdPaymentFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

export default function TrafficBalancesPage() {
  const {
    connection,
    clientLinks,
    adAccounts,
    getLatestSnapshot,
    fetchFinanceData,
    startOAuth,
    loading: metaLoading,
  } = useMetaAds();

  const { accounts, loading: crmLoading } = useCrm();
  const { trafficManagers, getMemberById } = useTeamMembers();
  const [fetchingFinance, setFetchingFinance] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const loading = metaLoading || crmLoading;

  const latestUpdateTimestamp = useMemo(() => {
    const activeAdAccountIds = clientLinks
      .filter(l => l.active)
      .map(l => l.ad_account_id);

    let latest: Date | null = null;
    for (const adAccountId of activeAdAccountIds) {
      const snapshot = getLatestSnapshot(adAccountId);
      if (snapshot?.fetched_at) {
        const snapshotDate = new Date(snapshot.fetched_at);
        if (!latest || snapshotDate > latest) latest = snapshotDate;
      }
    }
    return latest;
  }, [clientLinks, getLatestSnapshot]);

  // Build rows — only active CRM clients
  const balanceRows = useMemo(() => {
    return clientLinks
      .filter(link => link.active)
      .map(link => {
        const client = accounts.find(a => a.id === link.client_id);
        if (!client || client.status !== 'active') return null;

        const adAccount = adAccounts.find(a => a.ad_account_id === link.ad_account_id);
        if (!adAccount) return null;

        const snapshot = getLatestSnapshot(link.ad_account_id);
        const paymentMethod = client.ad_payment_method as AdPaymentMethod | null;
        const monthlyBudget = client.ad_monthly_budget ?? null;

        let displayedBalance: number | null = null;
        if (paymentMethod === 'cartao') {
          displayedBalance = 0;
        } else if (snapshot?.available_balance != null) {
          displayedBalance = Math.max(snapshot.available_balance, 0);
        }

        // Low balance = saldo < 20% da verba mensal (only if budget defined, not cartao)
        const isLowBalance =
          paymentMethod !== 'cartao' &&
          displayedBalance !== null &&
          monthlyBudget !== null &&
          monthlyBudget > 0 &&
          displayedBalance < monthlyBudget * 0.2;

        const trafficMemberId = client.traffic_member_id ?? null;

        return {
          clientId: client.id,
          clientName: client.name,
          adAccountId: adAccount.ad_account_id,
          adAccountName: adAccount.name,
          currency: adAccount.currency || 'BRL',
          displayedBalance,
          paymentMethod,
          monthlyBudget,
          paymentFrequency: client.ad_payment_frequency as AdPaymentFrequency | null,
          hasSnapshot: !!snapshot,
          isLowBalance,
          trafficMemberId,
          snapshotFetchedAt: snapshot?.fetched_at ?? null,
        };
      })
      .filter(Boolean) as {
        clientId: string;
        clientName: string;
        adAccountId: string;
        adAccountName: string;
        currency: string;
        displayedBalance: number | null;
        paymentMethod: AdPaymentMethod | null;
        monthlyBudget: number | null;
        paymentFrequency: AdPaymentFrequency | null;
        hasSnapshot: boolean;
        isLowBalance: boolean;
        trafficMemberId: string | null;
        snapshotFetchedAt: string | null;
      }[];
  }, [clientLinks, accounts, adAccounts, getLatestSnapshot]);

  // Apply filters
  const filteredRows = useMemo(() => {
    let rows = balanceRows;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        r => r.clientName.toLowerCase().includes(term) || r.adAccountName.toLowerCase().includes(term),
      );
    }

    if (filterResponsible !== 'all') {
      rows = rows.filter(r => r.trafficMemberId === filterResponsible);
    }

    if (filterStatus === 'low') {
      rows = rows.filter(r => r.isLowBalance);
    }

    return [...rows].sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [balanceRows, searchTerm, filterResponsible, filterStatus]);

  const handleRefreshAll = async () => {
    const allAccountIds = [...new Set(clientLinks.filter(l => l.active).map(l => l.ad_account_id))];
    if (allAccountIds.length === 0) return;
    setFetchingFinance(true);
    await fetchFinanceData(allAccountIds);
    setFetchingFinance(false);
  };

  const handleRefreshSingle = async (adAccountId: string) => {
    setRefreshingId(adAccountId);
    try {
      await fetchFinanceData([adAccountId]);
    } catch {
      toast.error('Erro ao atualizar saldo');
    }
    setRefreshingId(null);
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  };

  const lowBalanceCount = balanceRows.filter(r => r.isLowBalance).length;
  const missingBudgetCount = balanceRows.filter(r => !r.monthlyBudget && r.paymentMethod !== 'cartao').length;

  const isTokenExpired = connection?.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;

  const handleReconnect = async () => {
    await startOAuth();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 mt-2" /></div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Saldo de Contas de Anúncio
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os saldos disponíveis das contas de anúncio dos clientes.
          </p>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Meta Ads não conectado. Conecte em Configurações → Integrações → Meta Ads.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Saldo de Contas de Anúncio
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os saldos disponíveis das contas de anúncio dos clientes ativos.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {isTokenExpired && (
              <Button variant="destructive" size="sm" onClick={handleReconnect}>
                <LinkIcon className="h-4 w-4 mr-1" />
                Reconectar Meta
              </Button>
            )}
            <Button onClick={handleRefreshAll} disabled={fetchingFinance || balanceRows.length === 0 || isTokenExpired}>
              {fetchingFinance ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar Todos
            </Button>
          </div>
          {latestUpdateTimestamp && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Última atualização: {formatDistanceToNow(latestUpdateTimestamp, { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Token expired alert */}
      {isTokenExpired && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    Token do Meta Ads expirado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A conexão com o Meta expirou em {new Date(connection!.token_expires_at!).toLocaleDateString('pt-BR')}. 
                    Os saldos não estão sendo atualizados. Reconecte para restaurar a sincronização.
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleReconnect}>
                <LinkIcon className="h-4 w-4 mr-1" />
                Reconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {lowBalanceCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {lowBalanceCount} conta{lowBalanceCount > 1 ? 's' : ''} com saldo baixo ({'<'} 20% da verba mensal)
                </p>
                <p className="text-sm text-muted-foreground">
                  Atenção: essas contas podem parar de veicular anúncios em breve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {missingBudgetCount > 0 && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-accent-foreground" />
              <div>
                <p className="font-medium">
                  {missingBudgetCount} cliente{missingBudgetCount > 1 ? 's' : ''} sem verba mensal definida
                </p>
                <p className="text-sm text-muted-foreground">
                  O alerta de saldo baixo não será acionado para esses clientes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Todas as Contas</CardTitle>
                <CardDescription>
                  {filteredRows.length} conta{filteredRows.length !== 1 ? 's' : ''} de clientes ativos
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Buscar cliente ou conta..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterResponsible} onValueChange={setFilterResponsible}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Responsáveis</SelectItem>
                  {trafficManagers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="low">Apenas Saldo Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRows.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma conta encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Conta de Anúncio</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status do Saldo</TableHead>
                    <TableHead className="text-right">Verba Mensal</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, idx) => {
                    const responsible = getMemberById(row.trafficMemberId);
                    const isRefreshing = refreshingId === row.adAccountId;

                    return (
                      <TableRow
                        key={`${row.clientId}-${row.adAccountId}-${idx}`}
                        className={cn(row.isLowBalance && 'bg-destructive/5')}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {row.isLowBalance && (
                              <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
                            )}
                            {row.clientName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{row.adAccountName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{row.adAccountId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.paymentMethod === 'cartao' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : row.displayedBalance !== null ? (
                            <span
                              className={cn(
                                'font-medium',
                                row.isLowBalance ? 'text-destructive' : 'text-foreground',
                              )}
                            >
                              {formatCurrency(row.displayedBalance, row.currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.paymentMethod === 'cartao' ? (
                            <Badge variant="secondary">Cartão</Badge>
                          ) : row.isLowBalance ? (
                            <Badge variant="destructive">Saldo Baixo</Badge>
                          ) : row.displayedBalance !== null ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                              OK
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.monthlyBudget !== null ? (
                            <span className="font-medium">
                              {formatCurrency(row.monthlyBudget, row.currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Não definida</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.paymentFrequency ? (
                            <Badge variant="outline">
                              {PAYMENT_FREQUENCY_LABELS[row.paymentFrequency]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.paymentMethod ? (
                            <Badge variant={row.paymentMethod === 'cartao' ? 'secondary' : 'outline'}>
                              {PAYMENT_METHOD_LABELS[row.paymentMethod]}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-accent">
                              Não definido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {responsible ? (
                            <span className="text-sm">{responsible.name}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.snapshotFetchedAt ? (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(row.snapshotFetchedAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isRefreshing || row.paymentMethod === 'cartao' || isTokenExpired}
                            onClick={() => handleRefreshSingle(row.adAccountId)}
                            title={isTokenExpired ? 'Token expirado — reconecte o Meta' : 'Atualizar saldo'}
                          >
                            {isRefreshing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
