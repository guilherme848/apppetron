import { useState } from 'react';
import { Link2, RefreshCw, Loader2, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useMetaAds } from '@/hooks/useMetaAds';

export default function MetaIntegrationPage() {
  const {
    connection,
    adAccounts,
    snapshots,
    loading,
    startOAuth,
    syncAdAccounts,
    fetchFinanceData,
    getLatestSnapshot,
  } = useMetaAds();

  const [syncing, setSyncing] = useState(false);
  const [fetchingFinance, setFetchingFinance] = useState(false);

  const handleConnect = async () => {
    await startOAuth();
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncAdAccounts();
    setSyncing(false);
  };

  const handleFetchFinance = async () => {
    setFetchingFinance(true);
    await fetchFinanceData();
    setFetchingFinance(false);
  };

  const formatCurrency = (value: number | null, currency: string | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integração Meta Ads</h1>
        <p className="text-muted-foreground">
          Conecte a Business Manager para sincronizar contas de anúncio e monitorar saldos.
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Status da Conexão
          </CardTitle>
          <CardDescription>
            Gerencie a conexão com a Business Manager da Meta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Conectado</p>
                  <p className="text-sm text-muted-foreground">
                    BM ID: {connection.business_id}
                  </p>
                  {connection.token_expires_at && (
                    <p className="text-sm text-muted-foreground">
                      Token expira em: {formatDate(connection.token_expires_at)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleConnect}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Não conectado</p>
                  <p className="text-sm text-muted-foreground">
                    Conecte sua Business Manager para sincronizar contas de anúncio
                  </p>
                </div>
              </div>
              <Button onClick={handleConnect}>
                <Link2 className="h-4 w-4 mr-2" />
                Conectar BM (Meta)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad Accounts */}
      {connection && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contas de Anúncio</CardTitle>
                <CardDescription>
                  {adAccounts.length} contas sincronizadas
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSync} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Contas
                </Button>
                <Button onClick={handleFetchFinance} disabled={fetchingFinance || adAccounts.length === 0}>
                  {fetchingFinance ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  Atualizar Saldos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {adAccounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma conta sincronizada</p>
                <Button variant="link" onClick={handleSync} disabled={syncing}>
                  Sincronizar agora
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Spend Cap</TableHead>
                    <TableHead className="text-right">Saldo Disponível</TableHead>
                    <TableHead>Última Atualização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adAccounts.map((account) => {
                    const snapshot = getLatestSnapshot(account.ad_account_id);
                    const hasSpendCap = snapshot?.spend_cap != null;
                    const isLowBalance = hasSpendCap && 
                      snapshot?.available_balance != null && 
                      (snapshot?.available_balance ?? 0) < ((snapshot?.spend_cap ?? 0) * 0.1);

                    return (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell className="font-mono text-sm">{account.ad_account_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{account.currency || 'BRL'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(snapshot?.amount_spent ?? null, account.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {snapshot?.spend_cap !== null ? (
                            formatCurrency(snapshot.spend_cap, account.currency)
                          ) : (
                            <span className="text-muted-foreground">Sem limite</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasSpendCap ? (
                            <span className={isLowBalance ? 'text-destructive font-medium' : 'text-green-600'}>
                              {formatCurrency(snapshot?.available_balance ?? null, account.currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {snapshot ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDate(snapshot.fetched_at)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
