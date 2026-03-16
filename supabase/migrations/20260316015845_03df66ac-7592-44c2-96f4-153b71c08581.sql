
CREATE TABLE IF NOT EXISTS public.cliente_checkup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  onboarding_id uuid REFERENCES public.onboardings(id) ON DELETE CASCADE NOT NULL,
  atividade_redes integer,
  producao_video integer,
  mix_produtos integer,
  atendimento_whatsapp integer,
  maturidade_comercial integer,
  habitantes_raio integer,
  tamanho_operacao integer,
  bonus_acabamento boolean DEFAULT false,
  pontuacao_total integer,
  classificacao text,
  preenchido_por_id uuid REFERENCES public.team_members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(onboarding_id)
);

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS checkup_classificacao text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS checkup_pontuacao integer;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS checkup_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_checkup_values()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.atividade_redes IS NOT NULL AND (NEW.atividade_redes < 0 OR NEW.atividade_redes > 3) THEN
    RAISE EXCEPTION 'atividade_redes must be between 0 and 3';
  END IF;
  IF NEW.producao_video IS NOT NULL AND (NEW.producao_video < 0 OR NEW.producao_video > 3) THEN
    RAISE EXCEPTION 'producao_video must be between 0 and 3';
  END IF;
  IF NEW.mix_produtos IS NOT NULL AND (NEW.mix_produtos < 0 OR NEW.mix_produtos > 3) THEN
    RAISE EXCEPTION 'mix_produtos must be between 0 and 3';
  END IF;
  IF NEW.atendimento_whatsapp IS NOT NULL AND (NEW.atendimento_whatsapp < 0 OR NEW.atendimento_whatsapp > 3) THEN
    RAISE EXCEPTION 'atendimento_whatsapp must be between 0 and 3';
  END IF;
  IF NEW.maturidade_comercial IS NOT NULL AND (NEW.maturidade_comercial < 0 OR NEW.maturidade_comercial > 3) THEN
    RAISE EXCEPTION 'maturidade_comercial must be between 0 and 3';
  END IF;
  IF NEW.habitantes_raio IS NOT NULL AND (NEW.habitantes_raio < 0 OR NEW.habitantes_raio > 3) THEN
    RAISE EXCEPTION 'habitantes_raio must be between 0 and 3';
  END IF;
  IF NEW.tamanho_operacao IS NOT NULL AND (NEW.tamanho_operacao < 0 OR NEW.tamanho_operacao > 3) THEN
    RAISE EXCEPTION 'tamanho_operacao must be between 0 and 3';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_checkup
  BEFORE INSERT OR UPDATE ON public.cliente_checkup
  FOR EACH ROW EXECUTE FUNCTION public.validate_checkup_values();

ALTER TABLE public.cliente_checkup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read checkup"
  ON public.cliente_checkup FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert checkup"
  ON public.cliente_checkup FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update checkup"
  ON public.cliente_checkup FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
