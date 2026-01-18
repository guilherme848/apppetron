import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Contract, ContractStatus } from '@/types/crm';

interface ContractFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { mrr: number; start_date: string; status: ContractStatus; account_id: string }) => void;
  contract?: Contract;
  accountId: string;
}

export function ContractForm({ open, onClose, onSubmit, contract, accountId }: ContractFormProps) {
  const [mrr, setMrr] = useState(contract?.mrr?.toString() || '');
  const [startDate, setStartDate] = useState(contract?.start_date || '');
  const [status, setStatus] = useState<ContractStatus>(contract?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
