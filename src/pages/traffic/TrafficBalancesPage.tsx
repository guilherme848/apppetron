import { useState } from 'react';
import { DollarSign, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useMetaAds } from '@/hooks/useMetaAds';
import { useCrm } from '@/contexts/CrmContext';

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

  // Build a list of all client-ad-account combinations with data
  const balanceRows = clientLinks
    .filter(link => link.active)
    .map(link => {
      const client = accounts.find(a => a.id === link.client_id);
      const adAccount = adAccounts.find(a => a.ad_account_id === link.ad_account_id);
      const snapshot = getLatestSnapshot(link.ad_account_id);
      
      if (!client || !adAccount) return null;
      
      return {
        clientId: client.id,
        clientName: client.name,
        adAccountId: adAccount.ad_account_id,
        adAccountName: adAccount.name,
        currency: adAccount.currency || 'BRL',
        amountSpent: snapshot?.amount_spent ?? null,
        spendCap: snapshot?.spend_cap ?? null,
        availableBalance: snapshot?.available_balance ?? null,
        fetchedAt: snapshot?.fetched_at ?? null,
      };
    })
    .filter(Boolean) as {
      clientId: string;
      clientName: string;
      adAccountId: string;
      adAccountName: string;
      currency: string;
      amountSpent: number | null;
      spendCap: number | null;
      availableBalance: number | null;
      fetchedAt: string | null;
    }[];

  // Filter by search term
  const filteredRows = balanceRows.filter(row =>
    row.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.adAccountName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort: low balance first, then by client name
  const sortedRows = [...filteredRows].sort((a, b) => {
    const aLow = a.spendCap !== null && a.availableBalance !== null && a.availableBalance < a.spendCap * 0.1;
    const bLow = b.spendCap !== null && b.availableBalance !== null && b.availableBalance < b.spendCap * 0.1;
    if (aLow && !bLow) return -1;
    if (!aLow && bLow) return 1;
    return a.clientName.localeCompare(b.clientName);
  });

  const handleRefreshAll = async () => {
    const allAccountIds = [...new Set(clientLinks.filter(l => l.active).map(l => l.ad_account_id))];
    if (allAccountIds.length === 0) return;
    setFetchingFinance(true);
    await fetchFinanceData(allAccountIds);
    setFetchingFinance(false);
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  // Count low balance alerts
  const lowBalanceCount = sortedRows.filter(row =>
    row.spendCap !== null &&
    row.availableBalance !== null &&
    row.availableBalance < row.spendCap * 0.1
  ).length;

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
            Saldos de Anúncio
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
            Saldos de Anúncio
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os saldos disponíveis das contas de anúncio dos clientes.
          </p>
        </div>
        <Button onClick={handleRefreshAll} disabled={fetchingFinance || sortedRows.length === 0}>
          {fetchingFinance ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar Todos
        </Button>
      </div>

      {/* Alerts Summary */}
      {lowBalanceCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {lowBalanceCount} conta{lowBalanceCount > 1 ? 's' : ''} com saldo baixo
                </p>
                <p className="text-sm text-muted-foreground">
                  Saldo disponível abaixo de 10% do spend cap
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
                  <TableHead>Moeda</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Spend Cap</TableHead>
                  <TableHead className="text-right">Saldo Disponível</TableHead>
                  <TableHead>Última Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row, idx) => {
                  const hasSpendCap = row.spendCap !== null;
                  const isLowBalance = hasSpendCap &&
                    row.availableBalance !== null &&
                    row.availableBalance < row.spendCap * 0.1;

                  return (
                    <TableRow key={`${row.clientId}-${row.adAccountId}-${idx}`} className={isLowBalance ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium">{row.clientName}</TableCell>
                      <TableCell>
                        <div>
                          <p>{row.adAccountName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{row.adAccountId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.currency}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.amountSpent, row.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.spendCap !== null ? (
                          formatCurrency(row.spendCap, row.currency)
                        ) : (
                          <span className="text-muted-foreground">Sem limite</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasSpendCap ? (
                          <span className={isLowBalance ? 'text-destructive font-medium' : 'text-green-600 dark:text-green-400'}>
                            {formatCurrency(row.availableBalance, row.currency)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(row.fetchedAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
