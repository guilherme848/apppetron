import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Contract, ContractStatus } from '@/types/crm';
import { useSensitivePermission } from '@/hooks/useSensitivePermission';
import { Lock } from 'lucide-react';

interface ContractFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { mrr: number; start_date: string; status: ContractStatus; account_id: string }) => void;
  contract?: Contract;
  accountId: string;
}

export function ContractForm({ open, onClose, onSubmit, contract, accountId }: ContractFormProps) {
  const { canViewContractValues, isAdmin } = useSensitivePermission();
  const showValues = canViewContractValues();
  
  const [mrr, setMrr] = useState(contract?.mrr?.toString() || '');
  const [startDate, setStartDate] = useState(contract?.start_date || '');
  const [status, setStatus] = useState<ContractStatus>(contract?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only admin can set MRR values
    if (!showValues) {
      return;
    }
    
    if (mrr && startDate) {
      onSubmit({
        mrr: parseFloat(mrr),
        start_date: startDate,
        status,
        account_id: accountId,
      });
      setMrr('');
      setStartDate('');
      setStatus('active');
      onClose();
    }
  };

  // Non-admin users cannot create/edit contracts with values
  if (!showValues) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              A criação e edição de contratos com valores financeiros é restrita ao Administrador.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mrr">MRR (R$)</Label>
            <Input
              id="mrr"
              type="number"
              step="0.01"
              value={mrr}
              onChange={(e) => setMrr(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de início</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
