import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SimpleAccount {
  id: string;
  name: string;
}

interface BatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: SimpleAccount[];
  onSubmit: (data: { client_id: string; month_ref: string }) => Promise<{ data: any; error: any }>;
}

export function BatchForm({ open, onOpenChange, accounts, onSubmit }: BatchFormProps) {
  const [clientId, setClientId] = useState('');
  const [monthRef, setMonthRef] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!clientId || !monthRef) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(monthRef)) {
      toast.error('Formato do mês inválido. Use YYYY-MM');
      return;
    }

    setLoading(true);
    const { data, error } = await onSubmit({ client_id: clientId, month_ref: monthRef });
    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('Já existe um pacote para este cliente neste mês');
      } else {
        toast.error('Erro ao criar pacote');
      }
      return;
    }

    toast.success('Pacote criado com sucesso');
    setClientId('');
    setMonthRef('');
    onOpenChange(false);
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Pacote do Mês</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor="month">Mês (YYYY-MM) *</Label>
            <Input
              id="month"
              type="month"
              value={monthRef}
              onChange={(e) => setMonthRef(e.target.value)}
              placeholder={getCurrentMonth()}
            />
          </div>
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
