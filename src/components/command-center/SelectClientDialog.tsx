import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Account {
  id: string;
  name: string;
  status: string;
  health_status: string | null;
}

interface SelectClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (client: Account) => void;
  title?: string;
}

export function SelectClientDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Selecionar Cliente',
}: SelectClientDialogProps) {
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      supabase
        .from('accounts')
        .select('id, name, status, health_status')
        .order('name')
        .then(({ data }) => {
          if (data) setAccounts(data);
          setLoading(false);
        });
    }
  }, [open]);

  const filteredAccounts = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (account: Account) => {
    onSelect(account);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* List */}
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ) : filteredAccounts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum cliente encontrado
              </p>
            ) : (
              filteredAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelect(account)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg',
                    'hover:bg-muted/50 transition-colors text-left'
                  )}
                >
                  <span className="font-medium">{account.name}</span>
                  {account.health_status === 'critical' && (
                    <Badge variant="destructive">Crítico</Badge>
                  )}
                  {account.health_status === 'attention' && (
                    <Badge className="bg-warning/10 text-warning">Atenção</Badge>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
