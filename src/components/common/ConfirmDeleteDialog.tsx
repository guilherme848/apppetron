import { useState, useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDeleteDialogProps {
  /** The trigger element (usually a button) */
  children: React.ReactNode;
  /** Name of the item being deleted (displayed in the confirmation message) */
  itemName?: string;
  /** Custom title for the dialog */
  title?: string;
  /** Custom description for the dialog */
  description?: string;
  /** Additional warning message (e.g., for items with dependencies) */
  warning?: string;
  /** Callback function when deletion is confirmed */
  onConfirm: () => Promise<void> | void;
  /** Whether to require checkbox confirmation for permanent actions */
  requireConfirmation?: boolean;
  /** Custom label for the delete button */
  deleteLabel?: string;
  /** Custom label for the cancel button */
  cancelLabel?: string;
  /** Whether the dialog is controlled externally */
  open?: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function ConfirmDeleteDialog({
  children,
  itemName,
  title = 'Confirmar exclusão',
  description,
  warning,
  onConfirm,
  requireConfirmation = false,
  deleteLabel = 'Apagar',
  cancelLabel = 'Cancelar',
  open: controlledOpen,
  onOpenChange,
}: ConfirmDeleteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
      setConfirmed(false);
    }
  }, [open]);

  // Focus cancel button when dialog opens (to prevent accidental deletion)
  useEffect(() => {
    if (open && cancelRef.current) {
      setTimeout(() => {
        cancelRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (requireConfirmation && !confirmed) {
      setError('Confirme que entende que esta ação é permanente');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      console.error('Error deleting:', err);
      setError('Não foi possível apagar. Tente novamente.');
      setLoading(false);
    }
  };

  const defaultDescription = itemName
    ? `Tem certeza que deseja apagar "${itemName}"? Essa ação não poderá ser desfeita.`
    : 'Tem certeza que deseja apagar este item? Essa ação não poderá ser desfeita.';

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">{description || defaultDescription}</span>
            {warning && (
              <span className="block text-accent font-medium">
                <AlertTriangle className="inline-block h-4 w-4 mr-1 align-text-bottom" /> {warning}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireConfirmation && (
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label htmlFor="confirm-delete" className="text-sm text-muted-foreground cursor-pointer">
              Eu entendo que esta ação é permanente
            </Label>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef} disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || (requireConfirmation && !confirmed)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {loading ? (
              <>
                <Skeleton className="h-4 w-16 rounded" />
                Apagando...
              </>
            ) : (
              deleteLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
