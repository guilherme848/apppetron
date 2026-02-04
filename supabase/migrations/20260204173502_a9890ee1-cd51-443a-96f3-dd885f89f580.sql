-- Fix the generate_petron_onboarding_tasks function to use 'draft' instead of 'pending'
CREATE OR REPLACE FUNCTION public.generate_petron_onboarding_tasks(p_onboarding_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_sequence_id uuid;
  v_start_date date;
  v_step RECORD;
  v_task_count integer := 0;
BEGIN
  -- Get onboarding details
  SELECT plan_id, sequence_id, start_date
  INTO v_plan_id, v_sequence_id, v_start_date
  FROM petron_customer_onboardings
  WHERE id = p_onboarding_id;

  -- If no sequence specified, find the active one for the plan
  IF v_sequence_id IS NULL THEN
    SELECT id INTO v_sequence_id
    FROM petron_onboarding_sequences
    WHERE plan_id = v_plan_id AND active = true
    LIMIT 1;
    
    -- Update the onboarding with the found sequence
    IF v_sequence_id IS NOT NULL THEN
      UPDATE petron_customer_onboardings
      SET sequence_id = v_sequence_id
      WHERE id = p_onboarding_id;
    END IF;
  END IF;

  IF v_sequence_id IS NULL THEN
    RAISE EXCEPTION 'No active sequence found for this plan';
  END IF;

  -- Delete existing tasks for this onboarding
  DELETE FROM petron_onboarding_tasks WHERE onboarding_id = p_onboarding_id;

  -- Generate tasks from sequence steps
  FOR v_step IN
    SELECT 
      ss.step_order,
      ss.offset_days,
      at.title,
      at.description,
      at.default_sla_days,
      at.default_owner_role
    FROM petron_onboarding_sequence_steps ss
    JOIN petron_onboarding_activity_templates at ON at.id = ss.activity_template_id
    WHERE ss.sequence_id = v_sequence_id
    ORDER BY ss.step_order
  LOOP
    INSERT INTO petron_onboarding_tasks (
      onboarding_id,
      title,
      description,
      step_order,
      due_date,
      status
    ) VALUES (
      p_onboarding_id,
      v_step.title,
      v_step.description,
      v_step.step_order,
      v_start_date + COALESCE(v_step.offset_days, v_step.default_sla_days, 0),
      'todo'
    );
    
    v_task_count := v_task_count + 1;
  END LOOP;

  -- Update onboarding status from 'draft' to 'in_progress'
  UPDATE petron_customer_onboardings
  SET status = 'in_progress'
  WHERE id = p_onboarding_id AND status = 'draft';

  RETURN v_task_count;
END;
$$;