-- Insert new metrics for local businesses into the catalog
INSERT INTO traffic_metric_catalog (name, slug, description, category, unit, source, metric_type, formula, dependencies, availability_objectives, visible_for_managers, is_active, default_order)
VALUES 
  ('Conversas WhatsApp', 'whatsapp_conversations', 'Total de conversas iniciadas via WhatsApp', 'conversao', 'NUMBER', 'meta_api', 'simple', NULL, NULL, '["whatsapp"]'::jsonb, true, true, 20),
  ('Custo por Mensagem', 'cost_per_message', 'Custo médio por conversa/mensagem', 'custo', 'BRL', 'meta_api', 'simple', NULL, NULL, '["whatsapp"]'::jsonb, true, true, 21),
  ('Visitas no Perfil', 'profile_visits', 'Total de visitas ao perfil/página', 'clique', 'NUMBER', 'meta_api', 'simple', NULL, NULL, NULL, true, true, 22),
  ('Leads', 'leads', 'Total de leads gerados', 'conversao', 'NUMBER', 'meta_api', 'simple', NULL, NULL, '["lead"]'::jsonb, true, true, 23),
  ('Custo por Lead', 'cost_per_lead', 'Custo médio por lead', 'custo', 'BRL', 'meta_api', 'simple', NULL, NULL, '["lead"]'::jsonb, true, true, 24),
  ('Engajamento', 'engagement', 'Total de interações (curtidas, comentários, compartilhamentos)', 'clique', 'NUMBER', 'meta_api', 'simple', NULL, NULL, NULL, true, true, 25)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  availability_objectives = EXCLUDED.availability_objectives,
  is_active = true;

-- Add unique constraint on slug if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'traffic_metric_catalog_slug_unique'
  ) THEN
    ALTER TABLE traffic_metric_catalog ADD CONSTRAINT traffic_metric_catalog_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Update dashboard layout to include new metrics
UPDATE traffic_dashboard_layout
SET 
  cards = cards || '[{"slug": "whatsapp_conversations", "label": "Conversas WhatsApp"}, {"slug": "leads", "label": "Leads"}, {"slug": "profile_visits", "label": "Visitas Perfil"}]'::jsonb,
  columns = columns || '[{"slug": "whatsapp_conversations", "order": 20}, {"slug": "cost_per_message", "order": 21}, {"slug": "profile_visits", "order": 22}, {"slug": "leads", "order": 23}, {"slug": "cost_per_lead", "order": 24}, {"slug": "engagement", "order": 25}]'::jsonb
WHERE scope = 'global';