import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus, AlertTriangle, Megaphone, CreditCard } from 'lucide-react';
import { useMetaAds } from '@/hooks/useMetaAds';
import { Account, AdPaymentMethod } from '@/types/crm';

interface ClientTrafficSectionProps {
  account: Account;
  onUpdate: (field: keyof Account, value: string | null) => Promise<void>;
}

const PAYMENT_METHOD_OPTIONS: { value: AdPaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' },
];

export function ClientTrafficSection({ account, onUpdate }: ClientTrafficSectionProps) {
  const {
    connection,
    adAccounts,
    getClientAdAccounts,
    linkClientToAdAccount,
    unlinkClientFromAdAccount,
    loading,
  } = useMetaAds();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(account.ad_payment_method || '');

  const clientAdAccounts = getClientAdAccounts(account.id);
  const linkedAccountIds = clientAdAccounts.map(a => a.ad_account_id);
  const availableAccounts = adAccounts.filter(a => !linkedAccountIds.includes(a.ad_account_id));

  useEffect(() => {
    setPaymentMethod(account.ad_payment_method || '');
  }, [account.ad_payment_method]);

  const handleAddAccount = async () => {
    if (!selectedAccountId) return;
    await linkClientToAdAccount(account.id, selectedAccountId);
    setSelectedAccountId('');
  };

  const handleRemoveAccount = async (adAccountId: string) => {
    await unlinkClientFromAdAccount(account.id, adAccountId);
  };

  const handlePaymentMethodChange = async (value: string) => {
    const actualValue = value === 'none' ? null : value;
    setPaymentMethod(value);
    await onUpdate('ad_payment_method' as keyof Account, actualValue);
  };

  if (!connection) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Megaphone className="h-4 w-4" />
            Tráfego Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Meta Ads não conectado. Configure em Integrações → Meta Ads.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Megaphone className="h-4 w-4" />
          Tráfego Pago
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="ad_payment_method" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Método de Pagamento (Anúncios)
          </Label>
          <Select value={paymentMethod || 'none'} onValueChange={handlePaymentMethodChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não definido</SelectItem>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!paymentMethod && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Defina o método de pagamento para calcular saldo corretamente.
            </div>
          )}
        </div>

        {/* Linked Ad Accounts */}
        <div className="space-y-2">
          <Label>Conta(s) de Anúncio Vinculada(s)</Label>
          
          {clientAdAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta vinculada</p>
          ) : (
            <div className="space-y-2">
              {clientAdAccounts.map((adAccount) => (
                <div
                  key={adAccount.ad_account_id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div>
                    <p className="text-sm font-medium">{adAccount.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{adAccount.ad_account_id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAccount(adAccount.ad_account_id)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Account */}
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
            <Button onClick={handleAddAccount} disabled={!selectedAccountId} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Vincular
            </Button>
          </div>
        )}

        {adAccounts.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma conta de anúncio sincronizada. Vá em Integrações → Meta Ads para sincronizar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
