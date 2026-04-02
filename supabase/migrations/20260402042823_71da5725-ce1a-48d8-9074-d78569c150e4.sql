
-- Recreate view to only include clients with has_traffic service
CREATE OR REPLACE VIEW public.traffic_client_last_contact AS
SELECT
  a.id AS client_id,
  a.name AS client_name,
  a.traffic_member_id,
  a.status AS client_status,
  MAX(tc.contact_date) FILTER (WHERE tc.completed = true) AS last_contact_date,
  CURRENT_DATE - MAX(tc.contact_date) FILTER (WHERE tc.completed = true) AS days_since_contact
FROM accounts a
JOIN services s ON s.id = a.service_id AND s.has_traffic = true
LEFT JOIN traffic_contacts tc ON tc.client_id = a.id
WHERE a.status = 'active' AND a.deleted_at IS NULL
  AND (a.cliente_interno IS NULL OR a.cliente_interno = false)
GROUP BY a.id, a.name, a.traffic_member_id, a.status;
