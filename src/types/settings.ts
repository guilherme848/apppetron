export interface Service {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  traffic_cycle_id: string | null; // Legacy - kept for compatibility
  traffic_routine_id: string | null; // New - links to traffic_routines (master)
}

export interface Niche {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}
