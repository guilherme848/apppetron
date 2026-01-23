-- Add default_responsible_role_key column to pipeline stage config
ALTER TABLE public.content_stage_responsibilities 
ADD COLUMN IF NOT EXISTS default_responsible_role_key TEXT;

-- Populate based on existing role_id mappings
-- Social Media (406d5513-0550-43d8-a4a1-5796b9c8122f) -> 'social'
-- Atendimento (4e14d182-53a0-42f0-b13b-fa9cf98c5fb9) -> 'support'
UPDATE public.content_stage_responsibilities 
SET default_responsible_role_key = CASE 
  WHEN role_id = '406d5513-0550-43d8-a4a1-5796b9c8122f' THEN 'social'
  WHEN role_id = '4e14d182-53a0-42f0-b13b-fa9cf98c5fb9' THEN 'support'
  WHEN role_id = '5dc6ee4a-e4ff-4525-a58c-f2aff56d0321' THEN 'designer'
  WHEN role_id = '0d1b4828-d97a-42c6-a280-77fd49a4aec6' THEN 'videomaker'
  WHEN role_id = '29521693-8a2e-46fe-81a5-8b78059ad879' THEN 'traffic'
  WHEN role_id = '582610bd-1bee-42e2-aad5-8f359aaa274f' THEN 'cs'
  ELSE NULL
END;

-- Create function to get stage default role key
CREATE OR REPLACE FUNCTION public.get_stage_default_role_key(p_stage_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT default_responsible_role_key 
  FROM content_stage_responsibilities 
  WHERE stage_key = p_stage_key
$$;

-- Update trigger to apply pipeline stage defaults for non-format stages
CREATE OR REPLACE FUNCTION public.trg_content_posts_auto_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_batch_status text;
  v_format text;
  v_effective_role_key text;
  v_stage_default_role_key text;
BEGIN
  -- Get batch info
  SELECT cb.client_id, cb.status
  INTO v_client_id, v_batch_status
  FROM public.content_batches cb
  WHERE cb.id = NEW.batch_id;

  -- Get the format being used (new or old if unchanged)
  v_format := COALESCE(NEW.format, OLD.format);
  
  -- Determine effective role key based on stage
  IF v_batch_status IN ('production', 'changes') THEN
    -- Production/Changes: role determined by format (designer/videomaker)
    v_effective_role_key := public.get_role_key_from_format(v_format);
    IF v_effective_role_key IS NOT NULL THEN
      NEW.responsible_role_key := v_effective_role_key;
    END IF;
  ELSE
    -- All other stages: use pipeline stage default
    v_stage_default_role_key := public.get_stage_default_role_key(v_batch_status);
    IF v_stage_default_role_key IS NOT NULL THEN
      NEW.responsible_role_key := v_stage_default_role_key;
    END IF;
  END IF;
  
  -- ALWAYS: If responsible_role_key is set/changed, auto-assign from Account Team
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
$$;

-- Create function to reassign all posts when batch status changes
CREATE OR REPLACE FUNCTION public.reassign_batch_posts_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post RECORD;
  v_role_key text;
  v_assignee_id uuid;
  v_stage_default_role_key text;
BEGIN
  -- Only process if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the default role for the new stage
  v_stage_default_role_key := public.get_stage_default_role_key(NEW.status);
  
  -- Process each post in the batch
  FOR v_post IN 
    SELECT id, format, responsible_role_key, assignee_id, status
    FROM public.content_posts
    WHERE batch_id = NEW.id
  LOOP
    -- Determine the role key based on stage type
    IF NEW.status IN ('production', 'changes') THEN
      -- Production/Changes: role by format
      v_role_key := public.get_role_key_from_format(v_post.format);
    ELSE
      -- Other stages: use pipeline default
      v_role_key := v_stage_default_role_key;
    END IF;
    
    -- Skip if no role could be determined
    IF v_role_key IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Resolve assignee from account team
    v_assignee_id := public.resolve_assignee_from_account_team(NEW.client_id, v_role_key);
    
    -- Update the post with new role and assignee
    UPDATE public.content_posts
    SET 
      responsible_role_key = v_role_key,
      assignee_id = v_assignee_id,
      -- Reset status when entering production/changes
      status = CASE 
        WHEN NEW.status IN ('production', 'changes') THEN 'todo'
        ELSE status
      END,
      started_at = CASE 
        WHEN NEW.status IN ('production', 'changes') THEN NULL
        ELSE started_at
      END,
      completed_at = CASE 
        WHEN NEW.status IN ('production', 'changes') THEN NULL
        ELSE completed_at
      END,
      updated_at = NOW()
    WHERE id = v_post.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for batch status changes
DROP TRIGGER IF EXISTS trg_batch_status_change_reassign ON public.content_batches;
CREATE TRIGGER trg_batch_status_change_reassign
  AFTER UPDATE OF status ON public.content_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.reassign_batch_posts_on_status_change();

-- Update the account team change function to handle all roles
CREATE OR REPLACE FUNCTION public.reassign_posts_on_account_team_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If designer changed, reassign all posts with designer role
  IF OLD.designer_member_id IS DISTINCT FROM NEW.designer_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.designer_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cb.archived = false
      AND cp.responsible_role_key = 'designer'
      AND cp.status != 'done';
  END IF;

  -- If videomaker changed, reassign all posts with videomaker role
  IF OLD.videomaker_member_id IS DISTINCT FROM NEW.videomaker_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.videomaker_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cb.archived = false
      AND cp.responsible_role_key = 'videomaker'
      AND cp.status != 'done';
  END IF;

  -- If social changed, reassign all posts with social role
  IF OLD.social_member_id IS DISTINCT FROM NEW.social_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.social_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cb.archived = false
      AND cp.responsible_role_key = 'social'
      AND cp.status != 'done';
  END IF;

  -- If support changed, reassign all posts with support role
  IF OLD.support_member_id IS DISTINCT FROM NEW.support_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.support_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cb.archived = false
      AND cp.responsible_role_key = 'support'
      AND cp.status != 'done';
  END IF;

  -- If traffic changed, reassign all posts with traffic role
  IF OLD.traffic_member_id IS DISTINCT FROM NEW.traffic_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.traffic_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cb.archived = false
      AND cp.responsible_role_key = 'traffic'
      AND cp.status != 'done';
  END IF;

  -- If CS changed, reassign all posts with cs role
  IF OLD.cs_member_id IS DISTINCT FROM NEW.cs_member_id THEN
    UPDATE public.content_posts cp
    SET assignee_id = NEW.cs_member_id,
        updated_at = NOW()
    FROM public.content_batches cb
    WHERE cp.batch_id = cb.id
      AND cb.client_id = NEW.id
      AND cb.archived = false
      AND cp.responsible_role_key = 'cs'
      AND cp.status != 'done';
  END IF;

  -- Also update extra requests for the client
  IF OLD.designer_member_id IS DISTINCT FROM NEW.designer_member_id THEN
    UPDATE public.content_extra_requests
    SET assignee_id = NEW.designer_member_id, updated_at = NOW()
    WHERE client_id = NEW.id AND responsible_role_key = 'designer' AND status NOT IN ('done', 'canceled');
  END IF;

  IF OLD.videomaker_member_id IS DISTINCT FROM NEW.videomaker_member_id THEN
    UPDATE public.content_extra_requests
    SET assignee_id = NEW.videomaker_member_id, updated_at = NOW()
    WHERE client_id = NEW.id AND responsible_role_key = 'videomaker' AND status NOT IN ('done', 'canceled');
  END IF;

  IF OLD.social_member_id IS DISTINCT FROM NEW.social_member_id THEN
    UPDATE public.content_extra_requests
    SET assignee_id = NEW.social_member_id, updated_at = NOW()
    WHERE client_id = NEW.id AND responsible_role_key = 'social' AND status NOT IN ('done', 'canceled');
  END IF;

  IF OLD.support_member_id IS DISTINCT FROM NEW.support_member_id THEN
    UPDATE public.content_extra_requests
    SET assignee_id = NEW.support_member_id, updated_at = NOW()
    WHERE client_id = NEW.id AND responsible_role_key = 'support' AND status NOT IN ('done', 'canceled');
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on accounts table
DROP TRIGGER IF EXISTS trg_account_team_change_reassign ON public.accounts;
CREATE TRIGGER trg_account_team_change_reassign
  AFTER UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.reassign_posts_on_account_team_change();