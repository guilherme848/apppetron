import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { DiscDimension } from '@/types/disc';
import { DISC_COLORS, DISC_LABELS } from '@/types/disc';
import type {
  HrCompetency,
  HrInterviewQuestion,
  HrRubricCriterion,
  HrTargetDisc,
  HrTechnicalTestConfig,
} from '@/types/hrEvaluations';
import { DEFAULT_TARGET_DISC } from '@/types/hrEvaluations';

const DIMS: DiscDimension[] = ['D', 'I', 'S', 'C'];

interface Props {
  targetDisc: HrTargetDisc | null;
  competencies: HrCompetency[];
  interviewScript: HrInterviewQuestion[];
  technicalTest: HrTechnicalTestConfig | null;
  onChange: (patch: {
    target_disc?: HrTargetDisc;
    competencies?: HrCompetency[];
    interview_script?: HrInterviewQuestion[];
    technical_test?: HrTechnicalTestConfig | null;
  }) => void;
}

export function JobProfileEvaluationConfig(p: Props) {
  const target = p.targetDisc || DEFAULT_TARGET_DISC;
  const test = p.technicalTest || {
    enabled: false,
    title: 'Teste técnico',
    briefing: '',
    deadline_hours: 72,
    rubric: [],
  };

  return (
    <div className="space-y-8">
      {/* ───────────── Target DISC ───────────── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Perfil DISC ideal pra essa vaga</h3>
          <p className="text-xs text-muted-foreground">
            Define quanto cada dimensão D/I/S/C importa nessa função (0–100). O sistema calcula um %
            de fit comparando o resultado do candidato com esse alvo.
          </p>
        </div>
        <div className="space-y-4">
          {DIMS.map((d) => (
            <div key={d}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: DISC_COLORS[d] }}
                  >
                    {d}
                  </span>
                  {DISC_LABELS[d]}
                </span>
                <span className="text-sm font-semibold tabular-nums">{target[d]}</span>
              </div>
              <Slider
                value={[target[d]]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => p.onChange({ target_disc: { ...target, [d]: v[0] } })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── Competências ───────────── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Competências avaliadas em entrevista</h3>
          <p className="text-xs text-muted-foreground">
            Cada competência vira um campo de nota 1–5 nas entrevistas. Peso indica importância (1–5).
          </p>
        </div>
        <div className="space-y-2">
          {p.competencies.map((c, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => {
                    const arr = [...p.competencies];
                    arr[i] = { ...c, name: e.target.value };
                    p.onChange({ competencies: arr });
                  }}
                  placeholder="Nome da competência"
                />
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={c.weight}
                  onChange={(e) => {
                    const arr = [...p.competencies];
                    arr[i] = { ...c, weight: Math.max(1, Math.min(5, Number(e.target.value) || 1)) };
                    p.onChange({ competencies: arr });
                  }}
                  placeholder="Peso 1–5"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const arr = [...p.competencies];
                    arr.splice(i, 1);
                    p.onChange({ competencies: arr });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Input
                value={c.description || ''}
                onChange={(e) => {
                  const arr = [...p.competencies];
                  arr[i] = { ...c, description: e.target.value };
                  p.onChange({ competencies: arr });
                }}
                placeholder="O que essa competência significa nessa vaga"
                className="text-xs"
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              p.onChange({
                competencies: [...p.competencies, { name: 'Nova competência', weight: 3 }],
              })
            }
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar competência
          </Button>
        </div>
      </section>

      {/* ───────────── Roteiro de perguntas ───────────── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Roteiro de perguntas (entrevistas)</h3>
          <p className="text-xs text-muted-foreground">
            Aparece como guia pro entrevistador no momento da avaliação.
          </p>
        </div>
        <div className="space-y-2">
          {p.interviewScript.map((q, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-muted-foreground mt-2">
                  {(i + 1).toString().padStart(2, '0')}
                </span>
                <Textarea
                  value={q.question}
                  onChange={(e) => {
                    const arr = [...p.interviewScript];
                    arr[i] = { ...q, question: e.target.value };
                    p.onChange({ interview_script: arr });
                  }}
                  rows={2}
                  className="flex-1 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const arr = [...p.interviewScript];
                    arr.splice(i, 1);
                    p.onChange({ interview_script: arr });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Input
                value={q.focus_competency || ''}
                onChange={(e) => {
                  const arr = [...p.interviewScript];
                  arr[i] = { ...q, focus_competency: e.target.value };
                  p.onChange({ interview_script: arr });
                }}
                placeholder="Competência foco (opcional)"
                className="text-xs ml-7"
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              p.onChange({
                interview_script: [...p.interviewScript, { question: '' }],
              })
            }
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar pergunta
          </Button>
        </div>
      </section>

      {/* ───────────── Teste técnico ───────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Teste técnico (opcional)</h3>
            <p className="text-xs text-muted-foreground">
              Briefing prático que o candidato resolve antes da última entrevista.
            </p>
          </div>
          <Switch
            checked={test.enabled}
            onCheckedChange={(checked) =>
              p.onChange({ technical_test: { ...test, enabled: checked } })
            }
          />
        </div>

        {test.enabled && (
          <div className="space-y-3 border-l-2 border-primary/30 pl-4">
            <div>
              <Label className="text-xs">Título</Label>
              <Input
                value={test.title}
                onChange={(e) =>
                  p.onChange({ technical_test: { ...test, title: e.target.value } })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Briefing (o que o candidato precisa fazer)</Label>
              <Textarea
                value={test.briefing}
                onChange={(e) =>
                  p.onChange({ technical_test: { ...test, briefing: e.target.value } })
                }
                rows={6}
                placeholder="Descreva o desafio. Pode usar markdown simples (linhas, listas)."
              />
            </div>
            <div>
              <Label className="text-xs">Prazo (horas)</Label>
              <Input
                type="number"
                min={1}
                value={test.deadline_hours}
                onChange={(e) =>
                  p.onChange({
                    technical_test: { ...test, deadline_hours: Number(e.target.value) || 72 },
                  })
                }
              />
            </div>

            <div>
              <Label className="text-xs">Rubrica (critérios de avaliação)</Label>
              <div className="space-y-2 mt-1">
                {test.rubric.map((r, i) => (
                  <div key={i} className="rounded-lg border p-2 space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_auto] gap-2">
                      <Input
                        value={r.criterion}
                        onChange={(e) => {
                          const arr = [...test.rubric];
                          arr[i] = { ...r, criterion: e.target.value };
                          p.onChange({ technical_test: { ...test, rubric: arr } });
                        }}
                        placeholder="Critério"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={r.weight}
                        onChange={(e) => {
                          const arr = [...test.rubric];
                          arr[i] = {
                            ...r,
                            weight: Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                          };
                          p.onChange({ technical_test: { ...test, rubric: arr } });
                        }}
                        placeholder="Peso"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const arr = [...test.rubric];
                          arr.splice(i, 1);
                          p.onChange({ technical_test: { ...test, rubric: arr } });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      value={r.description || ''}
                      onChange={(e) => {
                        const arr = [...test.rubric];
                        arr[i] = { ...r, description: e.target.value };
                        p.onChange({ technical_test: { ...test, rubric: arr } });
                      }}
                      placeholder="Descrição do critério"
                      className="text-xs"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    p.onChange({
                      technical_test: {
                        ...test,
                        rubric: [...test.rubric, { criterion: 'Novo critério', weight: 3 }],
                      },
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Adicionar critério
                </Button>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {test.rubric.length} critério(s) configurado(s)
            </Badge>
          </div>
        )}
      </section>
    </div>
  );
}
