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
  onSubmit: (data: { client_id: string | null; month_ref: string }) => Promise<any>;
  hideClientField?: boolean;
  title?: string;
}

export function BatchForm({ 
  open, 
  onOpenChange, 
  accounts, 
  onSubmit,
  hideClientField = false,
  title = 'Novo Pacote do Mês',
}: BatchFormProps) {
  const [clientId, setClientId] = useState('');
  const [monthRef, setMonthRef] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Only require client if not hidden
    if (!hideClientField && !clientId) {
      toast.error('Selecione um cliente');
      return;
    }
    
    if (!monthRef) {
      toast.error('Preencha o mês');
      return;
    }

    // Validate month format
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
      
      // Handle different return types
      if (result && result.error) {
        if (result.error.code === '23505') {
          toast.error('Já existe um pacote para este mês');
        } else {
          toast.error('Erro ao criar pacote');
        }
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
