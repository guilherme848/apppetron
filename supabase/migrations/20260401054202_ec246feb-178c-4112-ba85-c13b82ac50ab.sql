
-- Create trigger function to auto-create onboarding when a new client is inserted
CREATE OR REPLACE FUNCTION public.trg_auto_create_detailed_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_onboarding_id uuid;
  v_question RECORD;
  v_prefill_value text;
BEGIN
  -- Skip internal account
  IF NEW.cliente_interno = true THEN
    RETURN NEW;
  END IF;

  -- Check if onboarding already exists for this client
  IF EXISTS (SELECT 1 FROM onboardings WHERE client_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Create onboarding record
  INSERT INTO onboardings (client_id, cs_owner_id, traffic_owner_id, status, data_inicio)
  VALUES (NEW.id, NEW.cs_member_id, NEW.traffic_member_id, 'em_andamento', CURRENT_DATE)
  RETURNING id INTO v_onboarding_id;

  -- Generate activities from templates using existing RPC logic
  PERFORM generate_onboarding_atividades(v_onboarding_id);

  -- Create empty responses for each active question, with prefill where applicable
  FOR v_question IN
    SELECT id, prefill_field
    FROM cs_onboarding_questions
    WHERE is_active = true
  LOOP
    v_prefill_value := NULL;

    IF v_question.prefill_field IS NOT NULL THEN
      CASE v_question.prefill_field
        WHEN 'contact_name' THEN v_prefill_value := NEW.contact_name;
        WHEN 'contact_email' THEN v_prefill_value := NEW.contact_email;
        WHEN 'contact_phone' THEN v_prefill_value := NEW.contact_phone;
        WHEN 'city_state' THEN v_prefill_value := CONCAT_WS(' - ', NEW.city, NEW.state);
        WHEN 'ad_monthly_budget' THEN v_prefill_value := NEW.ad_monthly_budget::text;
        WHEN 'website' THEN v_prefill_value := NEW.website;
        ELSE v_prefill_value := NULL;
      END CASE;
    END IF;

    INSERT INTO onboarding_reuniao_respostas (onboarding_id, pergunta_id, resposta)
    VALUES (v_onboarding_id, v_question.id, v_prefill_value);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trg_accounts_auto_create_detailed_onboarding
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_create_detailed_onboarding();
