import { useState } from 'react';
import { Link as LinkIcon, Unlink, RefreshCw, DollarSign, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useMetaAds } from '@/hooks/useMetaAds';
import { Skeleton } from '@/components/ui/skeleton';

export function MetaIntegrationTab() {
  const { 
    connection, adAccounts, snapshots, loading,
    startOAuth, syncAdAccounts, fetchFinanceData 
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

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  };

  const getLatestSnapshot = (adAccountId: string) => {
    return snapshots
      .filter(s => s.ad_account_id === adAccountId)
      .sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime())[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Meta Business Manager</CardTitle>
            <CardDescription>Conecte para sincronizar contas de anúncios.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {connection ? (
              <>
                <Badge variant="default" className="bg-primary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
                <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                  {syncing ? <Skeleton className="h-4 w-16 rounded" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-1">Sincronizar</span>
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                <LinkIcon className="h-4 w-4 mr-1" />
                Conectar
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {connection && adAccounts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Contas de Anúncio</CardTitle>
              <CardDescription>{adAccounts.length} contas sincronizadas</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleFetchFinance} disabled={fetchingFinance}>
              {fetchingFinance ? <Skeleton className="h-4 w-16 rounded" /> : <DollarSign className="h-4 w-4" />}
              <span className="ml-1">Atualizar Saldos</span>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Gasto</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adAccounts.map((account) => {
                  const snapshot = getLatestSnapshot(account.ad_account_id);
                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.ad_account_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(snapshot?.amount_spent ?? null)}</TableCell>
                      <TableCell>{formatCurrency(snapshot?.spend_cap ?? null)}</TableCell>
                      <TableCell>
                        <Badge variant={snapshot?.available_balance && snapshot.available_balance > 0 ? 'default' : 'secondary'}>
                          {formatCurrency(snapshot?.available_balance ?? null)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
