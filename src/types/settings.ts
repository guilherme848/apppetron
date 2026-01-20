export interface Service {
  id: string;
  name: string;
  active: boolean;
  traffic_cycle_id: string | null;
  created_at: string;
}

export interface Niche {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}
