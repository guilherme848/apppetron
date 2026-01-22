import { useState, useMemo } from 'react';
import { DollarSign, RefreshCw, Loader2, AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useMetaAds } from '@/hooks/useMetaAds';
import { useCrm } from '@/contexts/CrmContext';
import { AdPaymentMethod, AdPaymentFrequency } from '@/types/crm';
import { cn } from '@/lib/utils';

// Low balance threshold (R$ 500)
const LOW_BALANCE_THRESHOLD = 500;

// Payment method display labels
const PAYMENT_METHOD_LABELS: Record<AdPaymentMethod, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
};

// Payment frequency display labels
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
    loading: metaLoading,
  } = useMetaAds();

  const { accounts, loading: crmLoading } = useCrm();
  const [fetchingFinance, setFetchingFinance] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loading = metaLoading || crmLoading;

  // Find the latest snapshot timestamp across all linked accounts
  const latestUpdateTimestamp = useMemo(() => {
    const activeAdAccountIds = clientLinks
      .filter(l => l.active)
      .map(l => l.ad_account_id);
    
    let latest: Date | null = null;
    for (const adAccountId of activeAdAccountIds) {
      const snapshot = getLatestSnapshot(adAccountId);
      if (snapshot?.fetched_at) {
        const snapshotDate = new Date(snapshot.fetched_at);
        if (!latest || snapshotDate > latest) {
          latest = snapshotDate;
        }
      }
    }
    return latest;
  }, [clientLinks, getLatestSnapshot]);

  // Build a list of all client-ad-account combinations with data
  const balanceRows = clientLinks
    .filter(link => link.active)
    .map(link => {
      const client = accounts.find(a => a.id === link.client_id);
      const adAccount = adAccounts.find(a => a.ad_account_id === link.ad_account_id);
      const snapshot = getLatestSnapshot(link.ad_account_id);
      
      if (!client || !adAccount) return null;
      
      const paymentMethod = client.ad_payment_method as AdPaymentMethod | null;
      
      // Calculate displayed balance based on payment method rules
      let displayedBalance: number | null = null;
      if (paymentMethod === 'cartao') {
        // Card always shows 0
        displayedBalance = 0;
      } else if (snapshot?.available_balance != null) {
        // For pix/boleto, show max(balance, 0)
        displayedBalance = Math.max(snapshot.available_balance, 0);
      }
      
      // Check if balance is low (only for pix/boleto with actual balance)
      const isLowBalance = paymentMethod !== 'cartao' 
        && displayedBalance !== null 
        && displayedBalance <= LOW_BALANCE_THRESHOLD;
      
      return {
        clientId: client.id,
        clientName: client.name,
        adAccountId: adAccount.ad_account_id,
        adAccountName: adAccount.name,
        currency: adAccount.currency || 'BRL',
        displayedBalance,
        paymentMethod,
        monthlyBudget: client.ad_monthly_budget ?? null,
        paymentFrequency: client.ad_payment_frequency as AdPaymentFrequency | null,
        hasSnapshot: !!snapshot,
        isLowBalance,
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
    }[];

  // Filter by search term
  const filteredRows = balanceRows.filter(row =>
    row.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.adAccountName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort by client name A-Z
  const sortedRows = [...filteredRows].sort((a, b) =>
    a.clientName.localeCompare(b.clientName)
  );

  const handleRefreshAll = async () => {
    const allAccountIds = [...new Set(clientLinks.filter(l => l.active).map(l => l.ad_account_id))];
    if (allAccountIds.length === 0) return;
    setFetchingFinance(true);
    await fetchFinanceData(allAccountIds);
    setFetchingFinance(false);
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Count accounts without payment method defined
  const missingPaymentMethodCount = sortedRows.filter(row => !row.paymentMethod).length;
  
  // Count low balance accounts
  const lowBalanceCount = sortedRows.filter(row => row.isLowBalance).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Saldo de Contas de Anúncio
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os saldos disponíveis das contas de anúncio dos clientes.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={handleRefreshAll} disabled={fetchingFinance || sortedRows.length === 0}>
            {fetchingFinance ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar Todos
          </Button>
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

      {/* Alert for low balance accounts */}
      {lowBalanceCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {lowBalanceCount} conta{lowBalanceCount > 1 ? 's' : ''} com saldo baixo (≤ R$ {LOW_BALANCE_THRESHOLD})
                </p>
                <p className="text-sm text-muted-foreground">
                  Atenção: essas contas podem parar de veicular anúncios em breve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning for missing payment methods */}
      {missingPaymentMethodCount > 0 && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-accent-foreground" />
              <div>
                <p className="font-medium">
                  {missingPaymentMethodCount} cliente{missingPaymentMethodCount > 1 ? 's' : ''} sem método de pagamento definido
                </p>
                <p className="text-sm text-muted-foreground">
                  Configure o método de pagamento no cadastro do cliente para cálculo correto do saldo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Todas as Contas</CardTitle>
              <CardDescription>
                {sortedRows.length} conta{sortedRows.length !== 1 ? 's' : ''} vinculada{sortedRows.length !== 1 ? 's' : ''} a clientes
              </CardDescription>
            </div>
            <Input
              placeholder="Buscar cliente ou conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {sortedRows.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma conta de anúncio vinculada a clientes.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Conta de Anúncio</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Verba Mensal</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row, idx) => (
                  <TableRow 
                    key={`${row.clientId}-${row.adAccountId}-${idx}`}
                    className={cn(row.isLowBalance && "bg-destructive/5")}
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
                        <div className="flex items-center justify-end gap-2">
                          {row.isLowBalance && (
                            <Badge variant="attention" className="text-xs">
                              Saldo Baixo
                            </Badge>
                          )}
                          <span className={cn(
                            "font-medium",
                            row.isLowBalance ? "text-destructive" : "text-foreground"
                          )}>
                            {formatCurrency(row.displayedBalance, row.currency)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
