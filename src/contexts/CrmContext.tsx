import { createContext, useContext, ReactNode } from 'react';
import { useCrmData } from '@/hooks/useCrmData';

type CrmContextType = ReturnType<typeof useCrmData>;

const CrmContext = createContext<CrmContextType | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const crmData = useCrmData();
  return <CrmContext.Provider value={crmData}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextType {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within CrmProvider');
  }
  return context;
}
