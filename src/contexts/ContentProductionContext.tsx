import React, { createContext, useContext, ReactNode } from 'react';
import { useContentProductionData } from '@/hooks/useContentProductionData';

type ContentProductionContextType = ReturnType<typeof useContentProductionData>;

const ContentProductionContext = createContext<ContentProductionContextType | undefined>(undefined);

export function ContentProductionProvider({ children }: { children: ReactNode }) {
  const data = useContentProductionData();
  return (
    <ContentProductionContext.Provider value={data}>
      {children}
    </ContentProductionContext.Provider>
  );
}

export function useContentProduction() {
  const context = useContext(ContentProductionContext);
  if (!context) {
    throw new Error('useContentProduction must be used within ContentProductionProvider');
  }
  return context;
}
