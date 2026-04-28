// Rota TEMPORÁRIA pra visualizar como o DiscResultsCard renderiza.
// Acesso: /preview/disc — sem auth, sem dados reais. Remover depois.

import { DiscResultsCard } from '@/components/rh/DiscResultsCard';
import type { DiscAssessment } from '@/types/disc';

function mock(opts: {
  d_most: number; i_most: number; s_most: number; c_most: number;
  d_least: number; i_least: number; s_least: number; c_least: number;
  dominant: string;
  label: string;
}): DiscAssessment {
  return {
    id: 'preview',
    application_id: 'preview',
    access_token: 'preview',
    status: 'completed',
    responses: null,
    score_d_most: opts.d_most,
    score_i_most: opts.i_most,
    score_s_most: opts.s_most,
    score_c_most: opts.c_most,
    score_d_least: opts.d_least,
    score_i_least: opts.i_least,
    score_s_least: opts.s_least,
    score_c_least: opts.c_least,
    dominant_profile: opts.dominant,
    invited_by_member_id: null,
    started_at: '2026-04-27T20:00:00Z',
    completed_at: '2026-04-27T20:12:00Z',
    created_at: '2026-04-27T20:00:00Z',
    updated_at: '2026-04-27T20:12:00Z',
  };
}

const SAMPLES = [
  {
    label: 'Perfil DI — vendedor / SDR',
    a: mock({
      d_most: 8, i_most: 9, s_most: 4, c_most: 3,
      d_least: 3, i_least: 2, s_least: 8, c_least: 11,
      dominant: 'DI',
      label: 'DI',
    }),
  },
  {
    label: 'Perfil S — CS / atendimento',
    a: mock({
      d_most: 3, i_most: 6, s_most: 11, c_most: 4,
      d_least: 9, i_least: 4, s_least: 2, c_least: 9,
      dominant: 'SI',
      label: 'SI',
    }),
  },
  {
    label: 'Perfil CD — gestor de tráfego / analista',
    a: mock({
      d_most: 8, i_most: 2, s_most: 4, c_most: 10,
      d_least: 3, i_least: 11, s_least: 7, c_least: 3,
      dominant: 'CD',
      label: 'CD',
    }),
  },
  {
    label: 'Perfil IC — marketing de conteúdo',
    a: mock({
      d_most: 3, i_most: 9, s_most: 4, c_most: 8,
      d_least: 10, i_least: 4, s_least: 7, c_least: 3,
      dominant: 'IC',
      label: 'IC',
    }),
  },
];

export default function DiscPreview() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Preview · DiscResultsCard</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Rota temporária. Mostra como o card de resultado aparece pro recrutador na coluna lateral
          do candidato.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {SAMPLES.map((s) => (
            <div key={s.label} className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                {s.label}
              </div>
              <DiscResultsCard assessment={s.a} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
