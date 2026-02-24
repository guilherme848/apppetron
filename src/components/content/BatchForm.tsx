import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface SimpleAccount {
  id: string;
  name: string;
}

interface ExistingBatch {
  client_id: string | null;
  month_ref: string;
}

interface BatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: SimpleAccount[];
  onSubmit: (data: { client_id: string | null; month_ref: string }) => Promise<any>;
  hideClientField?: boolean;
  title?: string;
  existingBatches?: ExistingBatch[];
}

export function BatchForm({ 
  open, 
  onOpenChange, 
  accounts, 
  onSubmit,
  hideClientField = false,
  title = 'Novo Pacote do Mês',
  existingBatches = [],
}: BatchFormProps) {
  const [clientId, setClientId] = useState('');
  const [monthRef, setMonthRef] = useState('');
  const [loading, setLoading] = useState(false);

  const hasDuplicate = useMemo(() => {
    if (!clientId || !monthRef) return false;
    return existingBatches.some(b => b.client_id === clientId && b.month_ref === monthRef);
  }, [clientId, monthRef, existingBatches]);

  const handleSubmit = async () => {
    if (!hideClientField && !clientId) {
      toast.error('Selecione um cliente');
      return;
    }
    
    if (!monthRef) {
      toast.error('Preencha o mês');
      return;
    }

    if (!/^\d{4}-\d{2}$/.test(monthRef)) {
      toast.error('Formato do mês inválido. Use YYYY-MM');
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit({ 
        client_id: hideClientField ? null : clientId, 
        month_ref: monthRef 
      });
      
      if (result && result.error) {
        toast.error('Erro ao criar pacote');
        return;
      }

      setClientId('');
      setMonthRef('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error('Erro ao criar pacote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!hideClientField && (
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="month">Mês (YYYY-MM) *</Label>
            <Input
              id="month"
              type="month"
              value={monthRef}
              onChange={(e) => setMonthRef(e.target.value)}
            />
          </div>
          {hasDuplicate && (
            <div className="flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Já existe um planejamento para este cliente neste mês. Será criado um segundo pacote.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Pacote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
