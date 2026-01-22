import { useState } from 'react';
import { DollarSign, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useMetaAds } from '@/hooks/useMetaAds';
import { useCrm } from '@/contexts/CrmContext';
import { AdPaymentMethod } from '@/types/crm';

// Payment method display labels
const PAYMENT_METHOD_LABELS: Record<AdPaymentMethod, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
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
      
      return {
        clientId: client.id,
        clientName: client.name,
        adAccountId: adAccount.ad_account_id,
        adAccountName: adAccount.name,
        currency: adAccount.currency || 'BRL',
        displayedBalance,
        paymentMethod,
        hasSnapshot: !!snapshot,
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
      hasSnapshot: boolean;
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
        <Button onClick={handleRefreshAll} disabled={fetchingFinance || sortedRows.length === 0}>
          {fetchingFinance ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar Todos
        </Button>
      </div>

      {/* Warning for missing payment methods */}
      {missingPaymentMethodCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">
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
                  <TableHead>Método</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row, idx) => (
                  <TableRow key={`${row.clientId}-${row.adAccountId}-${idx}`}>
                    <TableCell className="font-medium">{row.clientName}</TableCell>
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
                        <span className={row.displayedBalance === 0 ? 'text-destructive font-medium' : 'text-green-600 dark:text-green-400'}>
                          {formatCurrency(row.displayedBalance, row.currency)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.paymentMethod ? (
                        <Badge variant={row.paymentMethod === 'cartao' ? 'secondary' : 'outline'}>
                          {PAYMENT_METHOD_LABELS[row.paymentMethod]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/50">
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
