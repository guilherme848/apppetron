-- =============================================
-- AUTO-ASSIGN BY FORMAT FOR PRODUCTION/CHANGES
-- =============================================

-- Helper function: maps format to role_key (designer or videomaker)
CREATE OR REPLACE FUNCTION public.get_role_key_from_format(p_format TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN p_format IN ('post', 'carrossel', 'carousel', 'story', 'artigo') THEN 'designer'
    WHEN p_format IN ('video', 'vídeo', 'reels', 'shorts') THEN 'videomaker'
    ELSE NULL
  END
$$;

-- Helper function: get batch status from batch_id
CREATE OR REPLACE FUNCTION public.get_batch_status(p_batch_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM content_batches WHERE id = p_batch_id;
$$;

-- Updated trigger function for content_posts that:
-- 1. For production/changes stages: assigns based on format (designer vs videomaker)
-- 2. For other stages: uses the responsible_role_key as before
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
  v_batch_status TEXT;
  v_format_role_key TEXT;
  v_effective_role_key TEXT;
BEGIN
  -- Get client_id from batch
  v_client_id := public.get_client_id_from_batch(NEW.batch_id);
  
  -- Get batch status
  v_batch_status := public.get_batch_status(NEW.batch_id);
  
  -- For production/changes stages, determine role based on format
  IF v_batch_status IN ('production', 'changes') THEN
    -- Get role from format
    v_format_role_key := public.get_role_key_from_format(NEW.format);
    
    -- If format maps to a role, use it; otherwise fallback to provided responsible_role_key
    IF v_format_role_key IS NOT NULL THEN
      v_effective_role_key := v_format_role_key;
      -- Update the responsible_role_key to match the format-derived role
      NEW.responsible_role_key := v_format_role_key;
    ELSE
      -- No valid format, use the existing responsible_role_key
      v_effective_role_key := NEW.responsible_role_key;
    END IF;
  ELSE
    -- For non-production/changes stages, use the provided responsible_role_key
    v_effective_role_key := NEW.responsible_role_key;
  END IF;
  
  -- Resolve assignee from account team using the effective role key
  v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, v_effective_role_key);
  
  -- Always override with resolved assignee (if found)
  IF v_assignee_id IS NOT NULL THEN
    NEW.assignee_id := v_assignee_id;
  ELSE
    -- If no assignee found and none provided, raise error
    IF NEW.assignee_id IS NULL THEN
      SELECT CASE v_effective_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        WHEN 'social' THEN 'Social Media'
        WHEN 'traffic' THEN 'Tráfego'
        WHEN 'support' THEN 'Atendimento'
        WHEN 'cs' THEN 'CS'
        ELSE v_effective_role_key
      END INTO v_role_label;
      
      RAISE EXCEPTION 'Defina o responsável do cargo "%" no Time da Conta do cliente para criar/atualizar esta tarefa.', v_role_label;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Re-create trigger (just to be safe)
DROP TRIGGER IF EXISTS trg_content_posts_auto_assign ON content_posts;
CREATE TRIGGER trg_content_posts_auto_assign
  BEFORE INSERT OR UPDATE ON content_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_content_posts_auto_assign();

-- Function to reassign all posts in a batch when entering production/changes
-- This is called from the frontend when batch status changes
CREATE OR REPLACE FUNCTION public.reassign_batch_posts_by_format(p_batch_id UUID)
RETURNS TABLE(post_id UUID, new_role_key TEXT, new_assignee_id UUID, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_batch_status TEXT;
  r_post RECORD;
  v_format_role_key TEXT;
  v_assignee_id UUID;
  v_role_label TEXT;
BEGIN
  -- Get batch info
  SELECT client_id, status INTO v_client_id, v_batch_status
  FROM content_batches
  WHERE id = p_batch_id;
  
  -- Only proceed if batch is in production or changes
  IF v_batch_status NOT IN ('production', 'changes') THEN
    RETURN;
  END IF;
  
  -- Iterate through all posts in the batch
  FOR r_post IN 
    SELECT id, format, responsible_role_key, assignee_id 
    FROM content_posts 
    WHERE batch_id = p_batch_id
  LOOP
    -- Get role from format
    v_format_role_key := public.get_role_key_from_format(r_post.format);
    
    -- If no valid format role, skip this post
    IF v_format_role_key IS NULL THEN
      post_id := r_post.id;
      new_role_key := r_post.responsible_role_key;
      new_assignee_id := r_post.assignee_id;
      error_message := 'Formato não mapeado para designer/videomaker';
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    -- Resolve assignee
    v_assignee_id := public.resolve_assignee_from_account_team(v_client_id, v_format_role_key);
    
    IF v_assignee_id IS NULL THEN
      -- Cannot assign - missing team member
      SELECT CASE v_format_role_key
        WHEN 'designer' THEN 'Designer'
        WHEN 'videomaker' THEN 'Videomaker'
        ELSE v_format_role_key
      END INTO v_role_label;
      
      post_id := r_post.id;
      new_role_key := v_format_role_key;
      new_assignee_id := NULL;
      error_message := 'Defina o "' || v_role_label || '" no Time da Conta do cliente';
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    -- Update the post
    UPDATE content_posts
    SET 
      responsible_role_key = v_format_role_key,
      assignee_id = v_assignee_id,
      updated_at = now()
    WHERE id = r_post.id;
    
    post_id := r_post.id;
    new_role_key := v_format_role_key;
    new_assignee_id := v_assignee_id;
    error_message := NULL;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;