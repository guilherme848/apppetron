export interface Deliverable {
  id: string;
  name: string;
  unit: string | null;
  active: boolean;
  created_at: string;
}

export interface ServiceDeliverable {
  id: string;
  service_id: string;
  deliverable_id: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  // Joined data
  deliverable?: Deliverable;
}
