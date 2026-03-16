
-- Account history table for tracking all changes
CREATE TABLE IF NOT EXISTS public.account_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_history_account ON public.account_history(account_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.account_history ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read and insert
CREATE POLICY "Authenticated users can view account history"
  ON public.account_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert account history"
  ON public.account_history FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger function to log account changes
CREATE OR REPLACE FUNCTION public.trg_log_account_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_member_id uuid;
  v_service_name text;
BEGIN
  -- Try to get current member id
  BEGIN
    SELECT id INTO v_member_id FROM public.team_members WHERE auth_user_id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_member_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
    VALUES (NEW.id, 'created', 'Cliente criado', v_member_id, jsonb_build_object('name', NEW.name, 'status', NEW.status));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'status_changed', 'Status alterado para ' || NEW.status, v_member_id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;

    -- Service/Plan change
    IF OLD.service_id IS DISTINCT FROM NEW.service_id THEN
      IF NEW.service_id IS NOT NULL THEN
        SELECT name INTO v_service_name FROM public.services WHERE id = NEW.service_id;
      END IF;
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'plan_changed', 'Plano alterado para ' || COALESCE(v_service_name, 'Nenhum'), v_member_id,
        jsonb_build_object('old_service_id', OLD.service_id, 'new_service_id', NEW.service_id));
    END IF;

    -- Traffic manager change
    IF OLD.traffic_member_id IS DISTINCT FROM NEW.traffic_member_id THEN
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'traffic_manager_changed', 'Gestor de Tráfego alterado', v_member_id,
        jsonb_build_object('old_id', OLD.traffic_member_id, 'new_id', NEW.traffic_member_id));
    END IF;

    -- CS change
    IF OLD.cs_member_id IS DISTINCT FROM NEW.cs_member_id THEN
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'cs_changed', 'Responsável CS alterado', v_member_id,
        jsonb_build_object('old_id', OLD.cs_member_id, 'new_id', NEW.cs_member_id));
    END IF;

    -- Designer change
    IF OLD.designer_member_id IS DISTINCT FROM NEW.designer_member_id THEN
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'team_changed', 'Designer alterado', v_member_id,
        jsonb_build_object('role', 'designer', 'old_id', OLD.designer_member_id, 'new_id', NEW.designer_member_id));
    END IF;

    -- Videomaker change
    IF OLD.videomaker_member_id IS DISTINCT FROM NEW.videomaker_member_id THEN
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'team_changed', 'Videomaker alterado', v_member_id,
        jsonb_build_object('role', 'videomaker', 'old_id', OLD.videomaker_member_id, 'new_id', NEW.videomaker_member_id));
    END IF;

    -- Social change
    IF OLD.social_member_id IS DISTINCT FROM NEW.social_member_id THEN
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'team_changed', 'Social Media alterado', v_member_id,
        jsonb_build_object('role', 'social', 'old_id', OLD.social_member_id, 'new_id', NEW.social_member_id));
    END IF;

    -- Support change
    IF OLD.support_member_id IS DISTINCT FROM NEW.support_member_id THEN
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'team_changed', 'Atendimento alterado', v_member_id,
        jsonb_build_object('role', 'support', 'old_id', OLD.support_member_id, 'new_id', NEW.support_member_id));
    END IF;

    -- Checkup classification change
    IF OLD.checkup_classificacao IS DISTINCT FROM NEW.checkup_classificacao AND NEW.checkup_classificacao IS NOT NULL THEN
      INSERT INTO public.account_history (account_id, event_type, description, member_id, metadata)
      VALUES (NEW.id, 'checkup_done', 'Checkup realizado — Perfil ' || NEW.checkup_classificacao, v_member_id,
        jsonb_build_object('classificacao', NEW.checkup_classificacao, 'pontuacao', NEW.checkup_pontuacao));
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_account_history_log
  AFTER INSERT OR UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_account_changes();
