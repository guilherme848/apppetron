import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Trash2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Account } from '@/types/crm';

export type RemovalType = 'delete' | 'churn';

interface AccountRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onConfirm: (type: RemovalType, churnDate?: string) => void;
}

export function AccountRemoveDialog({ open, onOpenChange, account, onConfirm }: AccountRemoveDialogProps) {
  const [removalType, setRemovalType] = useState<RemovalType>('churn');
  const [churnDate, setChurnDate] = useState<Date | undefined>(new Date());
  const [step, setStep] = useState<1 | 2>(1);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state on close
      setRemovalType('churn');
      setChurnDate(new Date());
      setStep(1);
    }
    onOpenChange(isOpen);
  };

  const handleNext = () => {
    if (removalType === 'churn') {
      setStep(2);
    } else {
      // For delete, go to confirmation step
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleConfirm = () => {
    if (removalType === 'churn' && churnDate) {
      onConfirm('churn', format(churnDate, 'yyyy-MM-dd'));
    } else if (removalType === 'delete') {
      onConfirm('delete');
    }
    handleOpenChange(false);
  };

  const canConfirm = removalType === 'delete' || (removalType === 'churn' && churnDate);

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {removalType === 'churn' ? <UserX className="h-5 w-5 text-primary" /> : <Trash2 className="h-5 w-5 text-destructive" />}
            Remover cliente
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? `Escolha como deseja remover "${account.name}" do sistema.`
              : removalType === 'churn' 
                ? 'Informe a data do cancelamento para registrar o churn.'
                : 'Confirme a exclusão permanente do cliente.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4">
            <RadioGroup value={removalType} onValueChange={(value) => setRemovalType(value as RemovalType)} className="space-y-3">
              <div 
                className={cn(
                  "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  removalType === 'churn' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}
                onClick={() => setRemovalType('churn')}
              >
                <RadioGroupItem value="churn" id="churn" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="churn" className="font-medium cursor-pointer">
                    Churn (cancelamento)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Registra o cancelamento mantendo todo o histórico. O cliente aparecerá nos relatórios de churn.
                  </p>
                </div>
              </div>

              <div 
                className={cn(
                  "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  removalType === 'delete' ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/50"
                )}
                onClick={() => setRemovalType('delete')}
              >
                <RadioGroupItem value="delete" id="delete" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="delete" className="font-medium cursor-pointer">
                    Exclusão (remover do sistema)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remove o cliente completamente. O registro será arquivado e não aparecerá nas listagens.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        {step === 2 && removalType === 'churn' && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="churn-date">Data do cancelamento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="churn-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !churnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {churnDate ? format(churnDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={churnDate}
                    onSelect={setChurnDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Esta data será usada para cálculo de métricas e relatórios de churn.
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium text-muted-foreground">O que acontece ao confirmar:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• Status será alterado para "Churned"</li>
                <li>• Data de cancelamento será registrada</li>
                <li>• Histórico completo será mantido</li>
                <li>• Cliente aparecerá nos relatórios de churn</li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && removalType === 'delete' && (
          <div className="py-4 space-y-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="font-medium text-destructive">⚠️ Atenção: Esta ação é permanente</p>
              <p className="text-sm text-muted-foreground mt-2">
                O cliente <strong>"{account.name}"</strong> será removido das listagens. 
                O registro será arquivado para fins de auditoria, mas não poderá ser restaurado facilmente.
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium text-muted-foreground">O que acontece ao confirmar:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• Cliente será removido das listagens</li>
                <li>• Status será alterado para arquivado</li>
                <li>• Dados relacionados serão mantidos para auditoria</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={handleBack} className="sm:order-1">
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="sm:order-2">
            Cancelar
          </Button>
          {step === 1 ? (
            <Button onClick={handleNext} className="sm:order-3">
              Continuar
            </Button>
          ) : (
            <Button 
              onClick={handleConfirm} 
              disabled={!canConfirm}
              variant={removalType === 'delete' ? 'destructive' : 'default'}
              className="sm:order-3"
            >
              {removalType === 'churn' ? 'Confirmar Churn' : 'Confirmar Exclusão'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
