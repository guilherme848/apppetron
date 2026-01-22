import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BirthdayModalProps {
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'petron_birthday_modal_shown';

export function useBirthdayModal(isUserBirthdayToday: boolean) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isUserBirthdayToday) {
      setShowModal(false);
      return;
    }

    // Check if modal was already shown today
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const storedDate = new Date(stored);
      const today = new Date();
      if (
        storedDate.getDate() === today.getDate() &&
        storedDate.getMonth() === today.getMonth() &&
        storedDate.getFullYear() === today.getFullYear()
      ) {
        // Already shown today
        return;
      }
    }

    // Show modal
    setShowModal(true);
  }, [isUserBirthdayToday]);

  const closeModal = () => {
    setShowModal(false);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  };

  return { showModal, closeModal };
}

export function BirthdayModal({ userName, isOpen, onClose }: BirthdayModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Feliz Aniversário</DialogTitle>
        </DialogHeader>
        <div className="text-center py-6 space-y-6">
          <div className="space-y-4">
            <p className="text-xl font-medium text-foreground">
              Hoje é seu dia.
            </p>
            <div className="text-muted-foreground leading-relaxed space-y-2">
              <p>Que esse novo ciclo venha com mais clareza,</p>
              <p>decisões firmes</p>
              <p>e tranquilidade no caminho.</p>
            </div>
            <p className="text-muted-foreground pt-2">
              A Petron fica feliz em construir isso com você.
            </p>
          </div>
          
          <p className="text-lg font-medium text-accent">
            Feliz aniversário, {userName}.
          </p>

          <Button 
            onClick={onClose}
            className="bg-accent hover:bg-accent/90 text-accent-foreground mt-4"
          >
            Obrigado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
