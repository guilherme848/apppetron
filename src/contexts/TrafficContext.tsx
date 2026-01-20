import { createContext, useContext, ReactNode } from 'react';
import { useTrafficData } from '@/hooks/useTrafficData';

type TrafficContextType = ReturnType<typeof useTrafficData>;

const TrafficContext = createContext<TrafficContextType | null>(null);

export function TrafficProvider({ children }: { children: ReactNode }) {
  const trafficData = useTrafficData();
  return <TrafficContext.Provider value={trafficData}>{children}</TrafficContext.Provider>;
}

export function useTraffic() {
  const context = useContext(TrafficContext);
  if (!context) {
    throw new Error('useTraffic must be used within TrafficProvider');
  }
  return context;
}
