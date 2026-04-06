-- Phase 1: Create function to sync checkup_classificacao to health_status
CREATE OR REPLACE FUNCTION public.sync_health_status_from_checkup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.checkup_classificacao IS DISTINCT FROM OLD.checkup_classificacao THEN
    UPDATE accounts SET
      health_status = CASE
        WHEN NEW.checkup_classificacao IN ('A', 'B') THEN 'healthy'
        WHEN NEW.checkup_classificacao = 'C' THEN 'attention'
        WHEN NEW.checkup_classificacao = 'D' THEN 'critical'
        ELSE health_status
      END,
      health_score = CASE
        WHEN NEW.checkup_classificacao = 'A' THEN 90
        WHEN NEW.checkup_classificacao = 'B' THEN 70
        WHEN NEW.checkup_classificacao = 'C' THEN 45
        WHEN NEW.checkup_classificacao = 'D' THEN 20
        ELSE health_score
      END
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_sync_health_from_checkup ON public.accounts;
CREATE TRIGGER trg_sync_health_from_checkup
  AFTER UPDATE OF checkup_classificacao ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_health_status_from_checkup();

-- Backfill existing data
UPDATE accounts SET
  health_status = CASE
    WHEN checkup_classificacao IN ('A', 'B') THEN 'healthy'
    WHEN checkup_classificacao = 'C' THEN 'attention'
    WHEN checkup_classificacao = 'D' THEN 'critical'
    ELSE health_status
  END,
  health_score = CASE
    WHEN checkup_classificacao = 'A' THEN 90
    WHEN checkup_classificacao = 'B' THEN 70
    WHEN checkup_classificacao = 'C' THEN 45
    WHEN checkup_classificacao = 'D' THEN 20
    ELSE health_score
  END
WHERE checkup_classificacao IS NOT NULL;
