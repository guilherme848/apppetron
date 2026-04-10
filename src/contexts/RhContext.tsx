import { createContext, useContext, ReactNode } from 'react';
import { useRhData } from '@/hooks/useRhData';

type RhContextType = ReturnType<typeof useRhData>;

const RhContext = createContext<RhContextType | null>(null);

export function RhProvider({ children }: { children: ReactNode }) {
  const rhData = useRhData();
  return <RhContext.Provider value={rhData}>{children}</RhContext.Provider>;
}

export function useRh(): RhContextType {
  const context = useContext(RhContext);
  if (!context) {
    throw new Error('useRh must be used within RhProvider');
  }
  return context;
}
