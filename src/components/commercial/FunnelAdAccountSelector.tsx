import { useState } from 'react';
import { Check, ChevronsUpDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MetaAdAccount } from '@/hooks/useMetaAds';

interface Props {
  adAccounts: MetaAdAccount[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
}

export function FunnelAdAccountSelector({ adAccounts, selectedIds, onChange, loading }: Props) {
  const [open, setOpen] = useState(false);

  const handleToggle = (adAccountId: string) => {
    if (selectedIds.includes(adAccountId)) {
      onChange(selectedIds.filter(id => id !== adAccountId));
    } else {
      onChange([...selectedIds, adAccountId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === adAccounts.length) {
      onChange([]);
    } else {
      onChange(adAccounts.map(a => a.ad_account_id));
    }
  };

  const selectedCount = selectedIds.length;
  const totalCount = adAccounts.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
          disabled={loading || adAccounts.length === 0}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="truncate">
              {selectedCount === 0 
                ? 'Selecione contas' 
                : selectedCount === totalCount 
                  ? 'Todas as contas' 
                  : `${selectedCount} conta${selectedCount > 1 ? 's' : ''}`}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar conta..." />
          <CommandList>
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={handleSelectAll}
                className="border-b mb-1"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCount === totalCount ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="font-medium">
                  {selectedCount === totalCount ? 'Desmarcar todas' : 'Selecionar todas'}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {totalCount}
                </Badge>
              </CommandItem>
              {adAccounts.map((account) => (
                <CommandItem
                  key={account.ad_account_id}
                  value={account.name}
                  onSelect={() => handleToggle(account.ad_account_id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.includes(account.ad_account_id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate flex-1">{account.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {account.currency || 'BRL'}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
