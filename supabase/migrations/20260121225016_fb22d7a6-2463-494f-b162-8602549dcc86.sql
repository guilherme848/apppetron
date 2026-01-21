-- =============================================
-- GLOBAL MANDATORY ASSIGNMENT SYSTEM
-- =============================================

-- 1) Create the central function for resolving assignee from Account Team
CREATE OR REPLACE FUNCTION public.resolve_assignee_from_account_team(
  p_client_id UUID,
  p_responsible_role_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignee_id UUID;
BEGIN
  IF p_client_id IS NULL OR p_responsible_role_key IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT 
    CASE p_responsible_role_key
      WHEN 'designer' THEN designer_member_id
      WHEN 'videomaker' THEN videomaker_member_id
      WHEN 'social' THEN social_member_id
      WHEN 'traffic' THEN traffic_member_id
      WHEN 'support' THEN support_member_id
      WHEN 'cs' THEN cs_member_id
      ELSE NULL
    END INTO v_assignee_id
  FROM accounts
  WHERE id = p_client_id;

  RETURN v_assignee_id;
END;
$$;

-- 2) Create a function to get client_id from batch (for content_posts)
CREATE OR REPLACE FUNCTION public.get_client_id_from_batch(p_batch_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM content_batches WHERE id = p_batch_id;
$$;

-- =============================================
-- 3) CONTENT POSTS - Add constraints and trigger
-- =============================================

-- First, backfill existing data
UPDATE content_posts
SET responsible_role_key = 'social'
WHERE responsible_role_key IS NULL;

UPDATE content_posts p
SET assignee_id = public.resolve_assignee_from_account_team(
  public.get_client_id_from_batch(p.batch_id),
  p.responsible_role_key
)
WHERE assignee_id IS NULL 
  AND responsible_role_key IS NOT NULL;

-- Set defaults and make NOT NULL
ALTER TABLE content_posts 
  ALTER COLUMN responsible_role_key SET DEFAULT 'social',
  ALTER COLUMN responsible_role_key SET NOT NULL;

-- Create trigger for auto-assignment
CREATE OR REPLACE FUNCTION public.trg_content_posts_auto_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_assignee_id UUID;
  v_role_label TEXT;
BEGIN
  -- Get client_id from batch
  v_client_id := public.get_client_id_from_batch(NEW.batch_id);
  
  -- Resolve assignee from account team
  v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
  
  -- Always override with resolved assignee (if found)
  IF v_assignee_id IS NOT NULL THEN
    NEW.assignee_id := v_assignee_id;
  ELSE
    -- If no assignee found and none provided, raise error
    IF NEW.assignee_id IS NULL THEN
      SELECT CASE NEW.responsible_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        WHEN 'social' THEN 'Social Media'
        WHEN 'traffic' THEN 'Tráfego'
        WHEN 'support' THEN 'Atendimento'
        WHEN 'cs' THEN 'CS'
        ELSE NEW.responsible_role_key
      END INTO v_role_label;
      
      RAISE EXCEPTION 'Defina o responsável do cargo "%" no Time da Conta do cliente para criar/atualizar esta tarefa.', v_role_label;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_posts_auto_assign ON content_posts;
CREATE TRIGGER trg_content_posts_auto_assign
  BEFORE INSERT OR UPDATE ON content_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_content_posts_auto_assign();

-- =============================================
-- 4) CONTENT EXTRA REQUESTS - Add constraints and trigger
-- =============================================

-- Backfill existing data
UPDATE content_extra_requests
SET responsible_role_key = 'social'
WHERE responsible_role_key IS NULL;

UPDATE content_extra_requests r
SET assignee_id = public.resolve_assignee_from_account_team(r.client_id, r.responsible_role_key)
WHERE assignee_id IS NULL 
  AND responsible_role_key IS NOT NULL
  AND client_id IS NOT NULL;

-- Set defaults and make NOT NULL
ALTER TABLE content_extra_requests 
  ALTER COLUMN responsible_role_key SET DEFAULT 'social',
  ALTER COLUMN responsible_role_key SET NOT NULL;

-- Create trigger for auto-assignment
CREATE OR REPLACE FUNCTION public.trg_extra_requests_auto_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignee_id UUID;
  v_role_label TEXT;
BEGIN
  -- Resolve assignee from account team
  v_assignee_id := public.resolve_assignee_from_account_team(NEW.client_id, NEW.responsible_role_key);
  
  -- Always override with resolved assignee (if found)
  IF v_assignee_id IS NOT NULL THEN
    NEW.assignee_id := v_assignee_id;
  ELSE
    IF NEW.assignee_id IS NULL THEN
      SELECT CASE NEW.responsible_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        WHEN 'social' THEN 'Social Media'
        WHEN 'traffic' THEN 'Tráfego'
        WHEN 'support' THEN 'Atendimento'
        WHEN 'cs' THEN 'CS'
        ELSE NEW.responsible_role_key
      END INTO v_role_label;
      
      RAISE EXCEPTION 'Defina o responsável do cargo "%" no Time da Conta do cliente para criar/atualizar esta solicitação.', v_role_label;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_extra_requests_auto_assign ON content_extra_requests;
CREATE TRIGGER trg_extra_requests_auto_assign
  BEFORE INSERT OR UPDATE ON content_extra_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_extra_requests_auto_assign();

-- =============================================
-- 5) TRAFFIC CREATIVE REQUESTS - Add constraints and trigger
-- =============================================

-- Backfill existing data
UPDATE traffic_creative_requests
SET responsible_role_key = 'designer'
WHERE responsible_role_key IS NULL;

UPDATE traffic_creative_requests r
SET assignee_id = public.resolve_assignee_from_account_team(r.client_id, r.responsible_role_key)
WHERE assignee_id IS NULL 
  AND responsible_role_key IS NOT NULL
  AND client_id IS NOT NULL;

-- Set defaults and make NOT NULL
ALTER TABLE traffic_creative_requests 
  ALTER COLUMN responsible_role_key SET DEFAULT 'designer',
  ALTER COLUMN responsible_role_key SET NOT NULL;

-- Create trigger for auto-assignment
CREATE OR REPLACE FUNCTION public.trg_creative_requests_auto_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignee_id UUID;
  v_role_label TEXT;
BEGIN
  -- Resolve assignee from account team
  v_assignee_id := public.resolve_assignee_from_account_team(NEW.client_id, NEW.responsible_role_key);
  
  -- Always override with resolved assignee (if found)
  IF v_assignee_id IS NOT NULL THEN
    NEW.assignee_id := v_assignee_id;
  ELSE
    IF NEW.assignee_id IS NULL THEN
      SELECT CASE NEW.responsible_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        WHEN 'social' THEN 'Social Media'
        WHEN 'traffic' THEN 'Tráfego'
        WHEN 'support' THEN 'Atendimento'
        WHEN 'cs' THEN 'CS'
        ELSE NEW.responsible_role_key
      END INTO v_role_label;
      
      RAISE EXCEPTION 'Defina o responsável do cargo "%" no Time da Conta do cliente para criar/atualizar esta solicitação.', v_role_label;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creative_requests_auto_assign ON traffic_creative_requests;
CREATE TRIGGER trg_creative_requests_auto_assign
  BEFORE INSERT OR UPDATE ON traffic_creative_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_creative_requests_auto_assign();

-- =============================================
-- 6) CS CLIENT ONBOARDING TASKS - Add responsible_role_key column and trigger
-- =============================================

-- Add responsible_role_key column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cs_client_onboarding_tasks' 
    AND column_name = 'responsible_role_key'
  ) THEN
    ALTER TABLE cs_client_onboarding_tasks ADD COLUMN responsible_role_key TEXT DEFAULT 'cs';
  END IF;
END $$;

-- Backfill: set responsible_role_key based on existing data
UPDATE cs_client_onboarding_tasks
SET responsible_role_key = 'cs'
WHERE responsible_role_key IS NULL;

-- Make NOT NULL
ALTER TABLE cs_client_onboarding_tasks 
  ALTER COLUMN responsible_role_key SET NOT NULL;

-- Create function to get client_id from onboarding
CREATE OR REPLACE FUNCTION public.get_client_id_from_onboarding(p_onboarding_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM cs_client_onboarding WHERE id = p_onboarding_id;
$$;

-- Create trigger for auto-assignment
CREATE OR REPLACE FUNCTION public.trg_cs_onboarding_tasks_auto_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_assignee_id UUID;
  v_role_label TEXT;
BEGIN
  -- Get client_id from onboarding
  v_client_id := public.get_client_id_from_onboarding(NEW.client_onboarding_id);
  
  -- Resolve assignee from account team
  v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
  
  -- Always override with resolved assignee (if found)
  IF v_assignee_id IS NOT NULL THEN
    NEW.responsible_member_id := v_assignee_id;
  ELSE
    IF NEW.responsible_member_id IS NULL THEN
      SELECT CASE NEW.responsible_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        WHEN 'social' THEN 'Social Media'
        WHEN 'traffic' THEN 'Tráfego'
        WHEN 'support' THEN 'Atendimento'
        WHEN 'cs' THEN 'CS'
        ELSE NEW.responsible_role_key
      END INTO v_role_label;
      
      RAISE EXCEPTION 'Defina o responsável do cargo "%" no Time da Conta do cliente para criar/atualizar esta tarefa de onboarding.', v_role_label;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cs_onboarding_tasks_auto_assign ON cs_client_onboarding_tasks;
CREATE TRIGGER trg_cs_onboarding_tasks_auto_assign
  BEFORE INSERT OR UPDATE ON cs_client_onboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cs_onboarding_tasks_auto_assign();

-- =============================================
-- 7) CS MEETING ACTIONS - Add responsible_role_key column and trigger
-- =============================================

-- Add responsible_role_key column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cs_meeting_actions' 
    AND column_name = 'responsible_role_key'
  ) THEN
    ALTER TABLE cs_meeting_actions ADD COLUMN responsible_role_key TEXT DEFAULT 'cs';
  END IF;
END $$;

-- Backfill
UPDATE cs_meeting_actions
SET responsible_role_key = 'cs'
WHERE responsible_role_key IS NULL;

-- Make NOT NULL
ALTER TABLE cs_meeting_actions 
  ALTER COLUMN responsible_role_key SET NOT NULL;

-- Create function to get client_id from meeting
CREATE OR REPLACE FUNCTION public.get_client_id_from_meeting(p_meeting_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM cs_meetings WHERE id = p_meeting_id;
$$;

-- Create trigger for auto-assignment
CREATE OR REPLACE FUNCTION public.trg_cs_meeting_actions_auto_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_assignee_id UUID;
  v_role_label TEXT;
BEGIN
  -- Get client_id from meeting
  v_client_id := public.get_client_id_from_meeting(NEW.meeting_id);
  
  -- Resolve assignee from account team
  v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
  
  -- Always override with resolved assignee (if found)
  IF v_assignee_id IS NOT NULL THEN
    NEW.assignee_member_id := v_assignee_id;
  ELSE
    IF NEW.assignee_member_id IS NULL THEN
      SELECT CASE NEW.responsible_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        WHEN 'social' THEN 'Social Media'
        WHEN 'traffic' THEN 'Tráfego'
        WHEN 'support' THEN 'Atendimento'
        WHEN 'cs' THEN 'CS'
        ELSE NEW.responsible_role_key
      END INTO v_role_label;
      
      RAISE EXCEPTION 'Defina o responsável do cargo "%" no Time da Conta do cliente para criar/atualizar esta ação de reunião.', v_role_label;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cs_meeting_actions_auto_assign ON cs_meeting_actions;
CREATE TRIGGER trg_cs_meeting_actions_auto_assign
  BEFORE INSERT OR UPDATE ON cs_meeting_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cs_meeting_actions_auto_assign();

-- =============================================
-- 8) CS RISK ACTION ITEMS - Add responsible_role_key column and trigger
-- =============================================

-- Add responsible_role_key column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cs_risk_action_items' 
    AND column_name = 'responsible_role_key'
  ) THEN
    ALTER TABLE cs_risk_action_items ADD COLUMN responsible_role_key TEXT DEFAULT 'cs';
  END IF;
END $$;

-- Backfill
UPDATE cs_risk_action_items
SET responsible_role_key = 'cs'
WHERE responsible_role_key IS NULL;

-- Make NOT NULL
ALTER TABLE cs_risk_action_items 
  ALTER COLUMN responsible_role_key SET NOT NULL;

-- Create function to get client_id from risk case
CREATE OR REPLACE FUNCTION public.get_client_id_from_risk_case(p_risk_case_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id FROM cs_risk_cases WHERE id = p_risk_case_id;
$$;

-- Create trigger for auto-assignment
CREATE OR REPLACE FUNCTION public.trg_cs_risk_actions_auto_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_assignee_id UUID;
  v_role_label TEXT;
BEGIN
  -- Get client_id from risk case
  v_client_id := public.get_client_id_from_risk_case(NEW.risk_case_id);
  
  -- Resolve assignee from account team
  v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
  
  -- Always override with resolved assignee (if found)
  IF v_assignee_id IS NOT NULL THEN
    NEW.assignee_member_id := v_assignee_id;
  ELSE
    IF NEW.assignee_member_id IS NULL THEN
      SELECT CASE NEW.responsible_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        WHEN 'social' THEN 'Social Media'
        WHEN 'traffic' THEN 'Tráfego'
        WHEN 'support' THEN 'Atendimento'
        WHEN 'cs' THEN 'CS'
        ELSE NEW.responsible_role_key
      END INTO v_role_label;
      
      RAISE EXCEPTION 'Defina o responsável do cargo "%" no Time da Conta do cliente para criar/atualizar esta ação de risco.', v_role_label;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cs_risk_actions_auto_assign ON cs_risk_action_items;
CREATE TRIGGER trg_cs_risk_actions_auto_assign
  BEFORE INSERT OR UPDATE ON cs_risk_action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cs_risk_actions_auto_assign();