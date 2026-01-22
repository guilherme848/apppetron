import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Plus, AlertTriangle, Megaphone, CreditCard, Check, ChevronsUpDown, DollarSign, CalendarClock } from 'lucide-react';
import { useMetaAds } from '@/hooks/useMetaAds';
import { Account, AdPaymentMethod, AdPaymentFrequency } from '@/types/crm';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface ClientTrafficSectionProps {
  account: Account;
  onUpdate: (field: keyof Account, value: string | number | null) => Promise<void>;
}

const PAYMENT_METHOD_OPTIONS: { value: AdPaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao', label: 'Cartão' },
];

const PAYMENT_FREQUENCY_OPTIONS: { value: AdPaymentFrequency; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
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
  const [monthlyBudget, setMonthlyBudget] = useState<string>(
    account.ad_monthly_budget != null ? String(account.ad_monthly_budget) : ''
  );
  const [paymentFrequency, setPaymentFrequency] = useState<string>(account.ad_payment_frequency || '');
  const [open, setOpen] = useState(false);

  const clientAdAccounts = getClientAdAccounts(account.id);
  const linkedAccountIds = clientAdAccounts.map(a => a.ad_account_id);
  const availableAccounts = adAccounts.filter(a => !linkedAccountIds.includes(a.ad_account_id));

  useEffect(() => {
    setPaymentMethod(account.ad_payment_method || '');
    setMonthlyBudget(account.ad_monthly_budget != null ? String(account.ad_monthly_budget) : '');
    setPaymentFrequency(account.ad_payment_frequency || '');
  }, [account.ad_payment_method, account.ad_monthly_budget, account.ad_payment_frequency]);

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

  const handleMonthlyBudgetBlur = useCallback(async () => {
    const numericValue = monthlyBudget ? parseFloat(monthlyBudget.replace(',', '.')) : null;
    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0)) {
      return; // Invalid value, do not save
    }
    const currentValue = account.ad_monthly_budget ?? null;
    if (numericValue !== currentValue) {
      await onUpdate('ad_monthly_budget' as keyof Account, numericValue);
    }
  }, [monthlyBudget, account.ad_monthly_budget, onUpdate]);

  const handlePaymentFrequencyChange = async (value: string) => {
    const actualValue = value === 'none' ? null : value;
    setPaymentFrequency(value);
    await onUpdate('ad_payment_frequency' as keyof Account, actualValue);
  };

  // Check if we should show the budget warning
  const needsBudgetWarning = 
    (paymentMethod === 'pix' || paymentMethod === 'boleto') && 
    !monthlyBudget;

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
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Defina o método de pagamento para calcular saldo corretamente.
            </div>
          )}
        </div>

        {/* Monthly Budget */}
        <div className="space-y-2">
          <Label htmlFor="ad_monthly_budget" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Verba Mensal Definida (R$)
          </Label>
          <Input
            id="ad_monthly_budget"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ex: 5000.00"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            onBlur={handleMonthlyBudgetBlur}
          />
          {needsBudgetWarning && (
            <div className="flex items-center gap-2 text-xs text-attention">
              <AlertTriangle className="h-3 w-3" />
              Defina a verba mensal para controle de saldo e planejamento.
            </div>
          )}
        </div>

        {/* Payment Frequency */}
        <div className="space-y-2">
          <Label htmlFor="ad_payment_frequency" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Frequência de Pagamento
          </Label>
          <Select value={paymentFrequency || 'none'} onValueChange={handlePaymentFrequencyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a frequência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não definida</SelectItem>
              {PAYMENT_FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Add Account with search */}
        {availableAccounts.length > 0 && (
          <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="flex-1 justify-between"
                >
                  {selectedAccountId
                    ? availableAccounts.find(a => a.ad_account_id === selectedAccountId)?.name ?? 'Selecionar...'
                    : 'Buscar conta de anúncio...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar conta..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                    <CommandGroup>
                      {availableAccounts.map((acc) => (
                        <CommandItem
                          key={acc.id}
                          value={`${acc.name} ${acc.ad_account_id}`}
                          onSelect={() => {
                            setSelectedAccountId(acc.ad_account_id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedAccountId === acc.ad_account_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{acc.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{acc.ad_account_id}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
