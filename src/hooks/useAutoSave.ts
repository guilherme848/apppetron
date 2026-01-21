import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions {
  onSave: (data: Record<string, any>) => Promise<void>;
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  showToasts?: boolean;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  saveNow: (patch: Record<string, any>) => Promise<void>;
  saveDebounced: (patch: Record<string, any>, delayMs?: number) => void;
  flush: () => Promise<void>;
  hasPendingChanges: boolean;
  retryCount: number;
  lastError: Error | null;
}

export function useAutoSave({
  onSave,
  debounceMs = 600,
  maxRetries = 3,
  retryDelayMs = 1000,
  showToasts = false,
}: AutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const pendingChanges = useRef<Record<string, any>>({});
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveInProgress = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const hasPendingChanges = Object.keys(pendingChanges.current).length > 0;

  const performSave = useCallback(async (data: Record<string, any>, attempt = 0): Promise<void> => {
    if (Object.keys(data).length === 0) return;
    
    saveInProgress.current = true;
    
    if (isMounted.current) {
      setStatus('saving');
      setLastError(null);
    }

    try {
      await onSave(data);
      
      if (isMounted.current) {
        setStatus('saved');
        setRetryCount(0);
        
        // Reset to idle after showing "saved" briefly
        setTimeout(() => {
          if (isMounted.current && !hasPendingChanges) {
            setStatus('idle');
          }
        }, 1500);

        if (showToasts) {
          toast.success('Salvo');
        }
      }
    } catch (error) {
      console.error('AutoSave error:', error);
      
      if (isMounted.current) {
        setLastError(error as Error);
        
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          
          if (showToasts) {
            toast.error(`Erro ao salvar. Tentando novamente... (${attempt + 1}/${maxRetries})`);
          }
          
          // Retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)));
          await performSave(data, attempt + 1);
        } else {
          setStatus('error');
          
          if (showToasts) {
            toast.error('Erro ao salvar. Por favor, tente novamente.');
          }
        }
      }
    } finally {
      saveInProgress.current = false;
    }
  }, [onSave, maxRetries, retryDelayMs, showToasts, hasPendingChanges]);

  const saveNow = useCallback(async (patch: Record<string, any>): Promise<void> => {
    // Clear any pending debounced saves
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }

    // Merge with pending changes
    const allChanges = { ...pendingChanges.current, ...patch };
    pendingChanges.current = {};
    
    await performSave(allChanges);
  }, [performSave]);

  const saveDebounced = useCallback((patch: Record<string, any>, delayMs?: number): void => {
    // Merge with existing pending changes
    pendingChanges.current = { ...pendingChanges.current, ...patch };

    // Clear existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new debounced save
    const delay = delayMs ?? debounceMs;
    debounceTimeout.current = setTimeout(async () => {
      const changes = { ...pendingChanges.current };
      pendingChanges.current = {};
      debounceTimeout.current = null;
      
      if (Object.keys(changes).length > 0) {
        await performSave(changes);
      }
    }, delay);
  }, [debounceMs, performSave]);

  const flush = useCallback(async (): Promise<void> => {
    // Clear debounce timer
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }

    // Save any pending changes immediately
    if (Object.keys(pendingChanges.current).length > 0) {
      const changes = { ...pendingChanges.current };
      pendingChanges.current = {};
      await performSave(changes);
    }
  }, [performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return {
    status,
    saveNow,
    saveDebounced,
    flush,
    hasPendingChanges,
    retryCount,
    lastError,
  };
}

// Hook for handling navigation with pending changes
export function useAutoSaveNavigation(flush: () => Promise<void>) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Trigger flush before page unload
      flush();
      
      // Show browser confirmation if there are pending changes
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Flush on component unmount (navigation)
      flush();
    };
  }, [flush]);
}
