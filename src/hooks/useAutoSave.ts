import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions {
  onSave: (data: Record<string, any>) => Promise<void>;
  maxRetries?: number;
  retryDelayMs?: number;
  showToasts?: boolean;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  saveNow: (patch: Record<string, any>) => Promise<void>;
  queueChange: (patch: Record<string, any>) => void;
  flush: () => Promise<void>;
  hasPendingChanges: boolean;
  retryCount: number;
  lastError: Error | null;
}

/**
 * Commit-based autosave hook.
 * 
 * - queueChange: Queue changes without triggering save (for onChange during typing)
 * - saveNow: Save immediately (for selects, toggles, date pickers)
 * - flush: Save all pending changes (for onBlur, tab change, navigation)
 * 
 * No debounce - saves only happen on explicit commit actions.
 */
export function useAutoSave({
  onSave,
  maxRetries = 3,
  retryDelayMs = 1000,
  showToasts = false,
}: AutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const pendingChanges = useRef<Record<string, any>>({});
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
          if (isMounted.current) {
            // Check if there are new pending changes
            if (Object.keys(pendingChanges.current).length > 0) {
              setStatus('pending');
            } else {
              setStatus('idle');
            }
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
  }, [onSave, maxRetries, retryDelayMs, showToasts]);

  /**
   * Queue changes without triggering a save.
   * Use this for onChange events during typing.
   * Changes will be saved on flush() or saveNow().
   */
  const queueChange = useCallback((patch: Record<string, any>): void => {
    pendingChanges.current = { ...pendingChanges.current, ...patch };
    
    if (isMounted.current && Object.keys(pendingChanges.current).length > 0) {
      setStatus('pending');
    }
  }, []);

  /**
   * Save immediately, merging with any pending changes.
   * Use this for selects, toggles, date pickers, and other instant-commit actions.
   */
  const saveNow = useCallback(async (patch: Record<string, any>): Promise<void> => {
    // Merge with pending changes
    const allChanges = { ...pendingChanges.current, ...patch };
    pendingChanges.current = {};
    
    await performSave(allChanges);
  }, [performSave]);

  /**
   * Flush all pending changes immediately.
   * Use this for onBlur, tab changes, and navigation.
   */
  const flush = useCallback(async (): Promise<void> => {
    // Save any pending changes immediately
    if (Object.keys(pendingChanges.current).length > 0) {
      const changes = { ...pendingChanges.current };
      pendingChanges.current = {};
      await performSave(changes);
    }
  }, [performSave]);

  return {
    status,
    saveNow,
    queueChange,
    flush,
    hasPendingChanges,
    retryCount,
    lastError,
  };
}

/**
 * Hook for handling navigation with pending changes.
 * Flushes changes before page unload or component unmount.
 */
export function useAutoSaveNavigation(flush: () => Promise<void>, hasPendingChanges?: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Trigger flush before page unload
      flush();
      
      // Show browser confirmation if there are pending changes
      if (hasPendingChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Flush on component unmount (navigation)
      flush();
    };
  }, [flush, hasPendingChanges]);
}
