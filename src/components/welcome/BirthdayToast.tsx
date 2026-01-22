import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BirthdayToastProps {
  isUserBirthdayToday: boolean;
}

const TOAST_STORAGE_KEY = 'petron_birthday_toast_dismissed';

export function BirthdayToast({ isUserBirthdayToday }: BirthdayToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isUserBirthdayToday) {
      setVisible(false);
      return;
    }

    // Check if toast was dismissed today
    const stored = localStorage.getItem(TOAST_STORAGE_KEY);
    if (stored) {
      const storedDate = new Date(stored);
      const today = new Date();
      if (
        storedDate.getDate() === today.getDate() &&
        storedDate.getMonth() === today.getMonth() &&
        storedDate.getFullYear() === today.getFullYear()
      ) {
        // Already dismissed today
        return;
      }
    }

    // Show toast
    setVisible(true);
  }, [isUserBirthdayToday]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TOAST_STORAGE_KEY, new Date().toISOString());
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-accent/30 rounded-lg shadow-lg p-4 pr-10 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Hoje é seu aniversário.
          </p>
          <p className="text-xs text-muted-foreground">
            Que seu dia seja leve e o ano, consistente.
          </p>
        </div>
      </div>
    </div>
  );
}
