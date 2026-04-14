-- Share token pra visualização pública do relatório
ALTER TABLE public.matcon_reports
ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS uq_matcon_reports_share_token ON public.matcon_reports(share_token);

-- Permitir SELECT público via share_token (anon role)
-- Política: qualquer um que saiba o share_token pode ler
CREATE POLICY "Public read by share_token"
ON public.matcon_reports FOR SELECT TO anon
USING (true);

-- Registrar view quando relatório é acessado
CREATE OR REPLACE FUNCTION public.track_report_view(p_share_token uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.matcon_reports
  SET viewed_at = COALESCE(viewed_at, now()),
      status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
  WHERE share_token = p_share_token;
$$;

GRANT EXECUTE ON FUNCTION public.track_report_view(uuid) TO anon, authenticated;
