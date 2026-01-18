import { createContext, useContext, ReactNode } from 'react';
import { useContentData } from '@/hooks/useContentData';

type ContentContextType = ReturnType<typeof useContentData>;

const ContentContext = createContext<ContentContextType | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const contentData = useContentData();
  return <ContentContext.Provider value={contentData}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within ContentProvider');
  }
  return context;
}
