import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Persist UI state in URL search params so it survives navigation.
 * Usage: const [value, setValue] = useSearchParamState('tab', 'default');
 */
export function useSearchParamState(key: string, defaultValue: string): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) || defaultValue;

  const setValue = useCallback((newValue: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newValue === defaultValue) {
        next.delete(key);
      } else {
        next.set(key, newValue);
      }
      return next;
    }, { replace: true });
  }, [key, defaultValue, setSearchParams]);

  return [value, setValue];
}
