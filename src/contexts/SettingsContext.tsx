import { createContext, useContext, ReactNode } from 'react';
import { useSettingsData } from '@/hooks/useSettingsData';

type SettingsContextType = ReturnType<typeof useSettingsData>;

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settingsData = useSettingsData();
  return <SettingsContext.Provider value={settingsData}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
