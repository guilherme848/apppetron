-- Remove blocking validation and allow NULL assignee for production/changes stages
-- Update the trigger to allow NULL assignee without blocking

CREATE OR REPLACE FUNCTION public.trg_content_posts_auto_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_batch_status TEXT;
  v_client_id UUID;
  v_format TEXT;
  v_effective_role_key TEXT;
  v_assignee_id UUID;
BEGIN
  -- Get batch info
  SELECT cb.status, cb.client_id
  INTO v_batch_status, v_client_id
  FROM public.content_batches cb
  WHERE cb.id = NEW.batch_id;
  
  -- If batch not found, skip
  IF v_batch_status IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get format
  v_format := COALESCE(NEW.format, '');
  
  -- Check if in format-based assignment stage
  IF v_batch_status IN ('production', 'changes') THEN
    -- Determine role based on format
    v_effective_role_key := public.get_role_key_from_format(v_format);
    
    -- If format doesn't map to a role, use the provided role key
    IF v_effective_role_key IS NULL THEN
      v_effective_role_key := NEW.responsible_role_key;
    END IF;
    
    -- Set the role key
    NEW.responsible_role_key := COALESCE(v_effective_role_key, NEW.responsible_role_key, 'social');
    
    -- Try to resolve assignee from account team (but don't block if not found)
    v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
    
    -- Set assignee if found (allow NULL if not found - no blocking)
    NEW.assignee_id := v_assignee_id;
  ELSE
    -- For other stages, try to resolve assignee but don't block
    v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, NEW.responsible_role_key);
    IF v_assignee_id IS NOT NULL THEN
      NEW.assignee_id := v_assignee_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the batch reassignment function to not skip posts without assignee
CREATE OR REPLACE FUNCTION public.reassign_batch_posts_by_format(p_batch_id UUID)
RETURNS TABLE(
  post_id UUID,
  new_role_key TEXT,
  new_assignee_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_batch_status TEXT;
  v_client_id UUID;
  r_post RECORD;
  v_format_role_key TEXT;
  v_assignee_id UUID;
  v_role_label TEXT;
BEGIN
  -- Get batch info
  SELECT cb.status, cb.client_id
  INTO v_batch_status, v_client_id
  FROM public.content_batches cb
  WHERE cb.id = p_batch_id;
  
  -- Only process if in production or changes
  IF v_batch_status NOT IN ('production', 'changes') THEN
    post_id := NULL;
    new_role_key := NULL;
    new_assignee_id := NULL;
    error_message := 'Batch status must be production or changes';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Loop through all posts in the batch
  FOR r_post IN 
    SELECT cp.id, cp.format
    FROM public.content_posts cp
    WHERE cp.batch_id = p_batch_id
  LOOP
    -- Determine role based on format
    v_format_role_key := public.get_role_key_from_format(r_post.format);
    
    -- If format doesn't map, default to social
    IF v_format_role_key IS NULL THEN
      v_format_role_key := 'social';
    END IF;
    
    -- Resolve assignee (may be NULL if team member not defined)
    v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, v_format_role_key);
    
    -- Always update the post (even if assignee is NULL)
    UPDATE public.content_posts
    SET 
      responsible_role_key = v_format_role_key,
      assignee_id = v_assignee_id,
      status = 'todo',
      started_at = NULL,
      completed_at = NULL,
      updated_at = NOW()
    WHERE id = r_post.id;
    
    -- Return info (with warning if no assignee)
    post_id := r_post.id;
    new_role_key := v_format_role_key;
    new_assignee_id := v_assignee_id;
    
    IF v_assignee_id IS NULL THEN
      SELECT CASE v_format_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        ELSE v_format_role_key
      END INTO v_role_label;
      error_message := 'Sem responsável - defina "' || v_role_label || '" no Time da Conta';
    ELSE
      error_message := NULL;
    END IF;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$function$;