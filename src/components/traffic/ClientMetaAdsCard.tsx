import { useState } from 'react';
import { DollarSign, RefreshCw, Loader2, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMetaAds } from '@/hooks/useMetaAds';

interface ClientMetaAdsCardProps {
  clientId: string;
}

export function ClientMetaAdsCard({ clientId }: ClientMetaAdsCardProps) {
  const {
    connection,
    adAccounts,
    getClientAdAccounts,
    getLatestSnapshot,
    linkClientToAdAccount,
    unlinkClientFromAdAccount,
    fetchFinanceData,
    loading,
  } = useMetaAds();

  const [fetchingFinance, setFetchingFinance] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const clientAdAccounts = getClientAdAccounts(clientId);
  const linkedAccountIds = clientAdAccounts.map(a => a.ad_account_id);
  const availableAccounts = adAccounts.filter(a => !linkedAccountIds.includes(a.ad_account_id));

  const handleAddAccount = async () => {
    if (!selectedAccountId) return;
    await linkClientToAdAccount(clientId, selectedAccountId);
    setSelectedAccountId('');
  };

  const handleRemoveAccount = async (adAccountId: string) => {
    await unlinkClientFromAdAccount(clientId, adAccountId);
  };

  const handleRefreshFinance = async () => {
    if (linkedAccountIds.length === 0) return;
    setFetchingFinance(true);
    await fetchFinanceData(linkedAccountIds);
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

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contas de Anúncio (Meta)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Meta Ads não conectado. Conecte em Configurações → Integrações → Meta Ads.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contas de Anúncio (Meta)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contas de Anúncio (Meta)
          </CardTitle>
          {clientAdAccounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshFinance}
              disabled={fetchingFinance}
            >
              {fetchingFinance ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar Saldos
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add account selector */}
        {availableAccounts.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Vincular conta de anúncio..." />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.ad_account_id}>
                    {account.name} ({account.ad_account_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddAccount} disabled={!selectedAccountId}>
              <Plus className="h-4 w-4 mr-2" />
              Vincular
            </Button>
          </div>
        )}

        {/* Linked accounts table */}
        {clientAdAccounts.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma conta de anúncio vinculada
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Moeda</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Spend Cap</TableHead>
                <TableHead className="text-right">Saldo Disponível</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientAdAccounts.map((account) => {
                const snapshot = getLatestSnapshot(account.ad_account_id);
                const hasSpendCap = snapshot?.spend_cap !== null;
                const isLowBalance = hasSpendCap && 
                  snapshot?.available_balance !== null && 
                  snapshot.available_balance < (snapshot.spend_cap || 0) * 0.1;

                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
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
                        <span className={isLowBalance ? 'text-destructive font-medium' : 'text-green-600 dark:text-green-400'}>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAccount(account.ad_account_id)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
