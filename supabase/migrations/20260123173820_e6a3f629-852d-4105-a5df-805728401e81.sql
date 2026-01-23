-- ==============================================
-- Drop existing function that needs return type change
-- ==============================================

DROP FUNCTION IF EXISTS public.reassign_batch_posts_by_format(uuid);

-- ==============================================
-- Update trigger to auto-assign when responsible_role_key changes
-- ==============================================

-- Drop existing trigger to recreate with updated logic
DROP TRIGGER IF EXISTS trg_content_posts_auto_assign ON public.content_posts;

-- Updated function: auto-assign on ANY change to responsible_role_key
CREATE OR REPLACE FUNCTION public.trg_content_posts_auto_assign()
RETURNS TRIGGER AS $function$
DECLARE
  v_client_id uuid;
  v_batch_status text;
  v_format text;
  v_effective_role_key text;
BEGIN
  -- Get batch info
  SELECT cb.client_id, cb.status
  INTO v_client_id, v_batch_status
  FROM public.content_batches cb
  WHERE cb.id = NEW.batch_id;

  -- Get the format being used (new or old if unchanged)
  v_format := COALESCE(NEW.format, OLD.format);
  
  -- If in production/changes stages, force role assignment by format
  IF v_batch_status IN ('production', 'changes') THEN
    v_effective_role_key := public.get_role_key_from_format(v_format);
    IF v_effective_role_key IS NOT NULL THEN
      NEW.responsible_role_key := v_effective_role_key;
    END IF;
  END IF;
  
  -- ALWAYS: If responsible_role_key is set/changed, auto-assign from Account Team
  -- This applies to ALL stages, not just production/changes
  IF NEW.responsible_role_key IS NOT NULL AND v_client_id IS NOT NULL THEN
    -- Only recalculate if role changed OR assignee is null OR client changed
    IF (TG_OP = 'INSERT') 
       OR (OLD.responsible_role_key IS DISTINCT FROM NEW.responsible_role_key)
       OR (NEW.assignee_id IS NULL) THEN
      NEW.assignee_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
    END IF;
  END IF;
  
  -- Handle lifecycle timestamps
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'doing' AND NEW.started_at IS NULL THEN
      NEW.started_at := NOW();
    ELSIF NEW.status = 'done' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    ELSIF NEW.status = 'todo' THEN
      NEW.started_at := NULL;
      NEW.completed_at := NULL;
    ELSIF NEW.status = 'doing' AND OLD.status = 'done' THEN
      NEW.completed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
CREATE TRIGGER trg_content_posts_auto_assign
BEFORE INSERT OR UPDATE ON public.content_posts
FOR EACH ROW
EXECUTE FUNCTION public.trg_content_posts_auto_assign();

-- ==============================================
-- Trigger for Account Team changes - reassign all related posts
-- ==============================================

-- Function to reassign posts when Account Team changes
CREATE OR REPLACE FUNCTION public.reassign_posts_on_account_team_change()
RETURNS TRIGGER AS $function$
BEGIN
  -- If designer changed, reassign all posts with designer role in production/changes
  IF OLD.designer_member_id IS DISTINCT FROM NEW.designer_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.designer_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cb.status IN ('production', 'changes')
      AND cp.responsible_role_key = 'designer';
  END IF;

  -- If videomaker changed, reassign all posts with videomaker role in production/changes
  IF OLD.videomaker_member_id IS DISTINCT FROM NEW.videomaker_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.videomaker_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cb.status IN ('production', 'changes')
      AND cp.responsible_role_key = 'videomaker';
  END IF;

  -- If social changed, reassign all posts with social role
  IF OLD.social_member_id IS DISTINCT FROM NEW.social_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.social_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cp.responsible_role_key = 'social';
  END IF;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on accounts table for team changes
DROP TRIGGER IF EXISTS trg_accounts_reassign_posts ON public.accounts;
CREATE TRIGGER trg_accounts_reassign_posts
AFTER UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.reassign_posts_on_account_team_change();

-- ==============================================
-- Recreate reassign_batch_posts_by_format with new return type
-- ==============================================

CREATE OR REPLACE FUNCTION public.reassign_batch_posts_by_format(p_batch_id uuid)
RETURNS jsonb AS $function$
DECLARE
  v_client_id uuid;
  v_batch_status text;
  v_posts_updated int := 0;
  v_posts_missing int := 0;
  v_post record;
  v_role_key text;
  v_assignee_id uuid;
BEGIN
  -- Get batch info
  SELECT client_id, status INTO v_client_id, v_batch_status
  FROM public.content_batches
  WHERE id = p_batch_id;
  
  -- Only process if in production or changes stage
  IF v_batch_status NOT IN ('production', 'changes') THEN
    RETURN jsonb_build_object('updated', 0, 'missing', 0, 'status', 'skipped');
  END IF;

  -- Process each post
  FOR v_post IN 
    SELECT id, format, responsible_role_key, assignee_id
    FROM public.content_posts
    WHERE batch_id = p_batch_id
  LOOP
    -- Determine role from format
    v_role_key := public.get_role_key_from_format(v_post.format);
    
    IF v_role_key IS NOT NULL THEN
      -- Resolve assignee from account team
      v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, v_role_key);
      
      -- Update the post
      UPDATE public.content_posts
      SET 
        responsible_role_key = v_role_key,
        assignee_id = v_assignee_id,
        status = 'todo',
        started_at = NULL,
        completed_at = NULL,
        updated_at = NOW()
      WHERE id = v_post.id;
      
      IF v_assignee_id IS NULL THEN
        v_posts_missing := v_posts_missing + 1;
      END IF;
      
      v_posts_updated := v_posts_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'updated', v_posts_updated,
    'missing', v_posts_missing,
    'status', 'success'
  );
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================
-- Remove blocking from other triggers (Extra Requests, Creative Requests, etc.)
-- ==============================================

-- Extra Requests: Remove blocking, allow NULL assignee
CREATE OR REPLACE FUNCTION public.trg_extra_requests_auto_assign()
RETURNS TRIGGER AS $function$
BEGIN
  -- Always resolve from account team - allow NULL (no blocking)
  NEW.assignee_id := public.resolve_assignee_from_account_team(NEW.client_id, NEW.responsible_role_key);
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Creative Requests: Remove blocking, allow NULL assignee
CREATE OR REPLACE FUNCTION public.trg_creative_requests_auto_assign()
RETURNS TRIGGER AS $function$
BEGIN
  -- Always resolve from account team - allow NULL (no blocking)
  NEW.assignee_id := public.resolve_assignee_from_account_team(NEW.client_id, NEW.responsible_role_key);
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CS Onboarding Tasks: Remove blocking, allow NULL assignee
CREATE OR REPLACE FUNCTION public.trg_cs_onboarding_tasks_auto_assign()
RETURNS TRIGGER AS $function$
DECLARE
  v_client_id UUID;
BEGIN
  v_client_id := public.get_client_id_from_onboarding(NEW.client_onboarding_id);
  NEW.responsible_member_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CS Meeting Actions: Remove blocking, allow NULL assignee
CREATE OR REPLACE FUNCTION public.trg_cs_meeting_actions_auto_assign()
RETURNS TRIGGER AS $function$
DECLARE
  v_client_id UUID;
BEGIN
  v_client_id := public.get_client_id_from_meeting(NEW.meeting_id);
  NEW.assignee_member_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CS Risk Actions: Remove blocking, allow NULL assignee
CREATE OR REPLACE FUNCTION public.trg_cs_risk_actions_auto_assign()
RETURNS TRIGGER AS $function$
DECLARE
  v_client_id UUID;
BEGIN
  v_client_id := public.get_client_id_from_risk_case(NEW.risk_case_id);
  NEW.assignee_member_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;