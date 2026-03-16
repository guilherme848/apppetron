import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, AlertTriangle, TrendingUp, CreditCard, Check, ChevronsUpDown, DollarSign, CalendarClock } from 'lucide-react';
import { useMetaAds } from '@/hooks/useMetaAds';
import { Account, AdPaymentMethod, AdPaymentFrequency } from '@/types/crm';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface ClientTrafficSectionProps {
  account: Account;
  onUpdate: (field: keyof Account, value: string | number | string[] | null) => Promise<void>;
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
  } = useMetaAds();

  const midias = account.midias_ativas || ['meta_ads'];
  const hasMetaAds = midias.includes('meta_ads');
  const hasGoogleAds = midias.includes('google_ads');

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(account.ad_payment_method || '');
  const [monthlyBudget, setMonthlyBudget] = useState<string>(
    account.ad_monthly_budget != null ? String(account.ad_monthly_budget) : ''
  );
  const [monthlyBudgetGoogle, setMonthlyBudgetGoogle] = useState<string>(
    account.ad_monthly_budget_google != null ? String(account.ad_monthly_budget_google) : ''
  );
  const [paymentFrequency, setPaymentFrequency] = useState<string>(account.ad_payment_frequency || '');
  const [open, setOpen] = useState(false);

  const clientAdAccounts = getClientAdAccounts(account.id);
  const linkedAccountIds = clientAdAccounts.map(a => a.ad_account_id);
  const availableAccounts = adAccounts.filter(a => !linkedAccountIds.includes(a.ad_account_id));

  useEffect(() => {
    setPaymentMethod(account.ad_payment_method || '');
    setMonthlyBudget(account.ad_monthly_budget != null ? String(account.ad_monthly_budget) : '');
    setMonthlyBudgetGoogle(account.ad_monthly_budget_google != null ? String(account.ad_monthly_budget_google) : '');
    setPaymentFrequency(account.ad_payment_frequency || '');
  }, [account.ad_payment_method, account.ad_monthly_budget, account.ad_monthly_budget_google, account.ad_payment_frequency]);

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
    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0)) return;
    const currentValue = account.ad_monthly_budget ?? null;
    if (numericValue !== currentValue) {
      await onUpdate('ad_monthly_budget' as keyof Account, numericValue);
    }
  }, [monthlyBudget, account.ad_monthly_budget, onUpdate]);

  const handleMonthlyBudgetGoogleBlur = useCallback(async () => {
    const numericValue = monthlyBudgetGoogle ? parseFloat(monthlyBudgetGoogle.replace(',', '.')) : null;
    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0)) return;
    const currentValue = account.ad_monthly_budget_google ?? null;
    if (numericValue !== currentValue) {
      await onUpdate('ad_monthly_budget_google' as keyof Account, numericValue);
    }
  }, [monthlyBudgetGoogle, account.ad_monthly_budget_google, onUpdate]);

  const handlePaymentFrequencyChange = async (value: string) => {
    const actualValue = value === 'none' ? null : value;
    setPaymentFrequency(value);
    await onUpdate('ad_payment_frequency' as keyof Account, actualValue);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const needsBudgetWarning =
    (paymentMethod === 'pix' || paymentMethod === 'boleto') &&
    !monthlyBudget;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />Tráfego Pago
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {hasMetaAds && (
              <Badge variant="outline" className="bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)] text-[11px] font-semibold px-2 py-0.5">
                Meta Ads
              </Badge>
            )}
            {hasGoogleAds && (
              <Badge variant="outline" className="bg-[hsl(var(--success)/.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/.25)] text-[11px] font-semibold px-2 py-0.5">
                Google Ads
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasMetaAds && !hasGoogleAds ? (
          <p className="text-[13px] text-muted-foreground">Nenhuma mídia configurada</p>
        ) : (
          <>
            {/* Meta Ads block */}
            {hasMetaAds && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">META ADS</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Verba mensal</p>
                    <p className="text-xl font-semibold font-mono text-primary">{formatCurrency(account.ad_monthly_budget)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Método</p>
                    <p className="text-[13px] text-muted-foreground">
                      {paymentMethod ? PAYMENT_METHOD_OPTIONS.find(o => o.value === paymentMethod)?.label || paymentMethod : '-'}
                    </p>
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Frequência: {paymentFrequency ? PAYMENT_FREQUENCY_OPTIONS.find(o => o.value === paymentFrequency)?.label || paymentFrequency : '-'}
                </p>

                {/* Linked Meta accounts */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contas vinculadas</p>
                  {clientAdAccounts.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">Nenhuma conta vinculada</p>
                  ) : (
                    <div className="space-y-1">
                      {clientAdAccounts.map((adAccount) => (
                        <div key={adAccount.ad_account_id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/50 border border-border">
                          <div>
                            <span className="text-[12px] font-mono text-foreground">{adAccount.ad_account_id}</span>
                            {adAccount.name && <span className="text-[12px] text-muted-foreground ml-2">— {adAccount.name}</span>}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveAccount(adAccount.ad_account_id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Meta account */}
                {connection && availableAccounts.length > 0 && (
                  <div className="flex gap-2">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={open} className="flex-1 justify-between text-xs h-8">
                          {selectedAccountId
                            ? availableAccounts.find(a => a.ad_account_id === selectedAccountId)?.name ?? 'Selecionar...'
                            : 'Buscar conta de anúncio...'}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[360px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar conta..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                            <CommandGroup>
                              {availableAccounts.map((acc) => (
                                <CommandItem
                                  key={acc.id}
                                  value={`${acc.name} ${acc.ad_account_id}`}
                                  onSelect={() => { setSelectedAccountId(acc.ad_account_id); setOpen(false); }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedAccountId === acc.ad_account_id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col">
                                    <span className="text-sm">{acc.name}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{acc.ad_account_id}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button onClick={handleAddAccount} disabled={!selectedAccountId} size="sm" className="h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" />Vincular
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Separator if both */}
            {hasMetaAds && hasGoogleAds && (
              <div className="border-t border-border" />
            )}

            {/* Google Ads block */}
            {hasGoogleAds && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">GOOGLE ADS</p>
                <div>
                  <p className="text-[11px] text-muted-foreground">Verba mensal</p>
                  <p className="text-xl font-semibold font-mono text-[hsl(var(--success))]">{formatCurrency(account.ad_monthly_budget_google)}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
