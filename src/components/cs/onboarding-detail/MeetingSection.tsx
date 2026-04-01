import { useState, useMemo, useCallback, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MeetingSectionProps {
  onboardingId: string;
  clientId: string;
  questions: any[];
  respostas: any[];
  transcricaoOnboardingConteudo: string | null;
  isConcluido: boolean;
  onAnswerBlur: (perguntaId: string, value: string) => void;
  onAnswerSave: (perguntaId: string, data: { resposta?: string | null; respostaJson?: any }) => void;
  onAiComplete: (filled: number, total: number) => void;
  onRefreshRespostas: () => void;
}

// ============ Helpers ============

function getRespostaRecord(respostas: any[], perguntaId: string) {
  return respostas?.find((r: any) => r.pergunta_id === perguntaId);
}

function isAnswered(q: any, respostas: any[], localAnswers: Record<string, any>): boolean {
  const local = localAnswers[q.id];
  const record = getRespostaRecord(respostas, q.id);
  const ft = q.field_type;

  if (ft === 'toggle') {
    const val = local?.toggle ?? record?.resposta_json?.toggle;
    return val !== undefined && val !== null;
  }
  if (ft === 'single_select') {
    const val = local?.select ?? record?.resposta_json?.select;
    return !!val;
  }
  if (ft === 'multi_select') {
    const val = local?.multi ?? record?.resposta_json?.multi;
    return Array.isArray(val) && val.length > 0;
  }
  if (ft === 'number') {
    const val = local?.number ?? record?.resposta_json?.number;
    return val !== undefined && val !== null && val !== '';
  }
  if (ft === 'compound') {
    const val = local?.compound ?? record?.resposta_json?.compound;
    if (val && typeof val === 'object') {
      return Object.values(val).some((v: any) => v !== null && v !== undefined && v !== '');
    }
    return false;
  }
  // text / long_text / short_text
  const textVal = local?.text ?? record?.resposta ?? '';
  return typeof textVal === 'string' && textVal.trim() !== '';
}

// ============ Field Components ============

function TextField({ question, value, onChange, onBlur, disabled, isPrefilled }: {
  question: any; value: string; onChange: (v: string) => void; onBlur: () => void; disabled: boolean; isPrefilled?: boolean;
}) {
  const isLong = question.field_type === 'long_text';
  return (
    <div className="space-y-1">
      {isLong ? (
        <Textarea
          placeholder={question.placeholder || 'Resposta...'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="min-h-[60px] resize-y text-sm bg-secondary border-border rounded-lg"
          disabled={disabled}
        />
      ) : (
        <Input
          placeholder={question.placeholder || 'Resposta...'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="text-sm bg-secondary border-border rounded-lg"
          disabled={disabled}
        />
      )}
      {isPrefilled && (
        <p className="text-[11px] text-muted-foreground">Preenchido automaticamente do cadastro</p>
      )}
    </div>
  );
}

function SingleSelectField({ question, value, otherValue, onChange, disabled }: {
  question: any; value: string; otherValue: string; onChange: (v: string, other?: string) => void; disabled: boolean;
}) {
  const options: any[] = question.options_json || [];
  const allowOther = question.allow_other;
  const isOther = value === '__other__';

  return (
    <div className="space-y-2">
      <Select value={value || ''} onValueChange={(v) => onChange(v)} disabled={disabled}>
        <SelectTrigger className="bg-secondary border-border rounded-lg text-sm">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt: any) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
          {allowOther && <SelectItem value="__other__">Outro</SelectItem>}
        </SelectContent>
      </Select>
      {isOther && (
        <Input
          placeholder="Especifique..."
          value={otherValue}
          onChange={(e) => onChange('__other__', e.target.value)}
          className="text-sm bg-secondary border-border rounded-lg"
          disabled={disabled}
        />
      )}
    </div>
  );
}

function MultiSelectField({ question, values, otherValue, onChange, disabled }: {
  question: any; values: string[]; otherValue: string; onChange: (vals: string[], other?: string) => void; disabled: boolean;
}) {
  const options: any[] = question.options_json || [];
  const allowOther = question.allow_other;
  const hasOther = values.includes('__other__');

  const toggle = (val: string) => {
    const next = values.includes(val) ? values.filter(v => v !== val) : [...values, val];
    onChange(next, otherValue);
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {options.map((opt: any) => (
          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
            <Checkbox
              checked={values.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
              disabled={disabled}
              className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
            />
            <span className="text-sm text-foreground">{opt.label}</span>
          </label>
        ))}
        {allowOther && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={hasOther}
              onCheckedChange={() => toggle('__other__')}
              disabled={disabled}
              className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
            />
            <span className="text-sm text-foreground">Outro</span>
          </label>
        )}
      </div>
      {hasOther && (
        <Input
          placeholder="Especifique..."
          value={otherValue}
          onChange={(e) => onChange(values, e.target.value)}
          className="text-sm bg-secondary border-border rounded-lg ml-6"
          disabled={disabled}
        />
      )}
    </div>
  );
}

function ToggleField({ value, onChange, disabled }: {
  value: boolean | null; onChange: (v: boolean) => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={value === true}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <span className="text-sm text-muted-foreground">{value === true ? 'Sim' : value === false ? 'Não' : 'Não definido'}</span>
    </div>
  );
}

function NumberField({ value, onChange, onBlur, disabled, mask }: {
  value: string; onChange: (v: string) => void; onBlur: () => void; disabled: boolean; mask?: string;
}) {
  return (
    <Input
      type={mask === 'moeda' ? 'text' : 'number'}
      placeholder={mask === 'moeda' ? 'R$ 0,00' : '0'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="text-sm bg-secondary border-border rounded-lg max-w-[200px]"
      disabled={disabled}
    />
  );
}

function CompoundField({ question, values, onChange, disabled, isPrefilled }: {
  question: any; values: Record<string, any>; onChange: (vals: Record<string, any>) => void; disabled: boolean; isPrefilled?: boolean;
}) {
  const subFields: any[] = question.sub_fields || [];

  const handleSubChange = (key: string, val: any) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <div className="space-y-3 pl-0">
      {subFields.map((sf: any) => (
        <div key={sf.key} className="space-y-1">
          <label className="text-[12px] font-medium text-muted-foreground">{sf.label}</label>
          {sf.type === 'boolean' ? (
            <div className="flex items-center gap-3">
              <Switch
                checked={values[sf.key] === true}
                onCheckedChange={(v) => handleSubChange(sf.key, v)}
                disabled={disabled}
              />
              <span className="text-sm text-muted-foreground">{values[sf.key] === true ? 'Sim' : 'Não'}</span>
            </div>
          ) : sf.type === 'single_select' ? (
            <Select value={values[sf.key] || ''} onValueChange={(v) => handleSubChange(sf.key, v)} disabled={disabled}>
              <SelectTrigger className="bg-secondary border-border rounded-lg text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {(sf.options || []).map((opt: any) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Resposta..."
              value={values[sf.key] || ''}
              onChange={(e) => handleSubChange(sf.key, e.target.value)}
              className="text-sm bg-secondary border-border rounded-lg"
              disabled={disabled}
            />
          )}
        </div>
      ))}
      {isPrefilled && (
        <p className="text-[11px] text-muted-foreground">Preenchido automaticamente do cadastro</p>
      )}
    </div>
  );
}

// ============ Main Component ============

export default function MeetingSection({
  onboardingId, clientId, questions, respostas, transcricaoOnboardingConteudo,
  isConcluido, onAnswerBlur, onAnswerSave, onAiComplete, onRefreshRespostas,
}: MeetingSectionProps) {
  const { toast } = useToast();
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBanner, setAiBanner] = useState<{ type: 'success' | 'error'; filled?: number; total?: number } | null>(null);
  const [aiFilledIds, setAiFilledIds] = useState<Set<string>>(new Set());
  const [localAnswers, setLocalAnswers] = useState<Record<string, any>>({});
  const [clientData, setClientData] = useState<Record<string, any> | null>(null);
  const [prefillApplied, setPrefillApplied] = useState<Set<string>>(new Set());

  // Fetch client data for prefill
  useEffect(() => {
    if (!clientId) return;
    supabase
      .from('accounts')
      .select('*')
      .eq('id', clientId)
      .single()
      .then(({ data }) => {
        if (data) setClientData(data);
      });
  }, [clientId]);

  // Apply prefill for questions with prefill_field
  useEffect(() => {
    if (!clientData || !questions || !respostas) return;

    const prefillMap: Record<string, string> = {
      contact_name: clientData.contact_name || '',
      contact_email: clientData.contact_email || '',
      contact_phone: clientData.contact_phone || '',
      city_state: [clientData.city, clientData.state].filter(Boolean).join(' - '),
      ad_monthly_budget: clientData.ad_monthly_budget?.toString() || '',
      website: clientData.website || '',
    };

    const newPrefills = new Set<string>();
    questions.forEach((q: any) => {
      if (!q.prefill_field) return;
      const existing = getRespostaRecord(respostas, q.id);
      // Only prefill if no existing answer
      if (existing?.resposta?.trim() || existing?.resposta_json) return;
      if (localAnswers[q.id]) return;

      const val = prefillMap[q.prefill_field];
      if (val) {
        // For compound fields with prefill, set in compound sub-field
        if (q.field_type === 'compound' && q.sub_fields) {
          const subWithPrefill = q.sub_fields.find((sf: any) => sf.prefill_field === q.prefill_field);
          if (subWithPrefill) {
            setLocalAnswers(prev => ({
              ...prev,
              [q.id]: { compound: { ...prev[q.id]?.compound, [subWithPrefill.key]: val } }
            }));
            newPrefills.add(q.id);
          }
        } else {
          setLocalAnswers(prev => ({ ...prev, [q.id]: { text: val } }));
          newPrefills.add(q.id);
        }
      }
    });

    if (newPrefills.size > 0) {
      setPrefillApplied(prev => new Set([...prev, ...newPrefills]));
    }
  }, [clientData, questions, respostas]);

  // Also check sub_fields for prefill_field
  useEffect(() => {
    if (!clientData || !questions || !respostas) return;

    const prefillMap: Record<string, string> = {
      contact_name: clientData.contact_name || '',
      contact_email: clientData.contact_email || '',
      contact_phone: clientData.contact_phone || '',
      city_state: [clientData.city, clientData.state].filter(Boolean).join(' - '),
      ad_monthly_budget: clientData.ad_monthly_budget?.toString() || '',
      website: clientData.website || '',
    };

    questions.forEach((q: any) => {
      if (q.field_type !== 'compound' || !q.sub_fields) return;
      const existing = getRespostaRecord(respostas, q.id);
      if (existing?.resposta_json?.compound) return;

      q.sub_fields.forEach((sf: any) => {
        if (!sf.prefill_field) return;
        const val = prefillMap[sf.prefill_field];
        if (val && !localAnswers[q.id]?.compound?.[sf.key]) {
          setLocalAnswers(prev => ({
            ...prev,
            [q.id]: { compound: { ...prev[q.id]?.compound, [sf.key]: val } }
          }));
          setPrefillApplied(prev => new Set([...prev, q.id]));
        }
      });
    });
  }, [clientData, questions, respostas]);

  const questionBlocks = useMemo(() => {
    if (!questions) return [];
    const blocks: Record<string, { title: string; questions: any[] }> = {};
    questions.forEach((q: any) => {
      if (!blocks[q.block_key]) blocks[q.block_key] = { title: q.block_title, questions: [] };
      blocks[q.block_key].questions.push(q);
    });
    return Object.entries(blocks).map(([key, val]) => ({ key, title: val.title, questions: val.questions }));
  }, [questions]);

  // Conditional visibility check
  const isQuestionVisible = useCallback((q: any): boolean => {
    // Check if question has validation_json with conditional logic
    // The field is stored as validation_json in the DB
    const condition = q.validation_json;
    if (!condition || !condition.campo || !condition.valor) return true;

    const triggerQ = questions.find((qq: any) => qq.id === condition.campo);
    if (!triggerQ) return true;

    const record = getRespostaRecord(respostas, condition.campo);
    const localVal = localAnswers[condition.campo];

    // Check the trigger answer
    let triggerAnswer: any = null;

    if (triggerQ.field_type === 'toggle') {
      triggerAnswer = localVal?.toggle ?? record?.resposta_json?.toggle;
      if (triggerAnswer === true) triggerAnswer = 'Sim';
      if (triggerAnswer === false) triggerAnswer = 'Não';
    } else if (triggerQ.field_type === 'single_select') {
      triggerAnswer = localVal?.select ?? record?.resposta_json?.select;
    } else {
      triggerAnswer = localVal?.text ?? record?.resposta ?? '';
    }

    // Support array of values for condition
    if (Array.isArray(condition.valor)) {
      return condition.valor.includes(triggerAnswer);
    }

    return triggerAnswer === condition.valor;
  }, [questions, respostas, localAnswers]);

  // Get answer value based on field type
  const getTextAnswer = useCallback((qId: string) => {
    if (localAnswers[qId]?.text !== undefined) return localAnswers[qId].text;
    const record = getRespostaRecord(respostas, qId);
    return record?.resposta || '';
  }, [respostas, localAnswers]);

  const getJsonAnswer = useCallback((qId: string) => {
    const local = localAnswers[qId];
    if (local) return local;
    const record = getRespostaRecord(respostas, qId);
    return record?.resposta_json || {};
  }, [respostas, localAnswers]);

  // Visible questions for counting
  const visibleQuestions = useMemo(() => {
    return (questions || []).filter((q: any) => isQuestionVisible(q));
  }, [questions, isQuestionVisible]);

  const answeredCount = useMemo(() => {
    return visibleQuestions.filter((q: any) => isAnswered(q, respostas, localAnswers)).length;
  }, [visibleQuestions, respostas, localAnswers]);

  const getBlockProgress = (blockQuestions: any[]) => {
    const visible = blockQuestions.filter(q => isQuestionVisible(q));
    return {
      answered: visible.filter(q => isAnswered(q, respostas, localAnswers)).length,
      total: visible.length,
    };
  };

  // ============ Save handlers ============

  const handleTextChange = (qId: string, value: string) => {
    setLocalAnswers(prev => ({ ...prev, [qId]: { text: value } }));
    setAiFilledIds(prev => { const n = new Set(prev); n.delete(qId); return n; });
  };

  const handleTextBlur = (qId: string) => {
    const val = localAnswers[qId]?.text;
    if (val !== undefined) {
      onAnswerBlur(qId, val);
    }
  };

  const handleSelectChange = (qId: string, value: string, otherText?: string) => {
    const data = { select: value, other: otherText || '' };
    setLocalAnswers(prev => ({ ...prev, [qId]: data }));
    onAnswerSave(qId, { respostaJson: data });
  };

  const handleMultiChange = (qId: string, values: string[], otherText?: string) => {
    const data = { multi: values, other: otherText || '' };
    setLocalAnswers(prev => ({ ...prev, [qId]: data }));
    onAnswerSave(qId, { respostaJson: data });
  };

  const handleToggleChange = (qId: string, value: boolean) => {
    const data = { toggle: value };
    setLocalAnswers(prev => ({ ...prev, [qId]: data }));
    onAnswerSave(qId, { respostaJson: data });
  };

  const handleNumberChange = (qId: string, value: string) => {
    setLocalAnswers(prev => ({ ...prev, [qId]: { number: value } }));
  };

  const handleNumberBlur = (qId: string) => {
    const val = localAnswers[qId]?.number;
    if (val !== undefined) {
      onAnswerSave(qId, { respostaJson: { number: val } });
    }
  };

  const handleCompoundChange = (qId: string, values: Record<string, any>) => {
    const data = { compound: values };
    setLocalAnswers(prev => ({ ...prev, [qId]: data }));
    // Debounce-save on change for compound
    onAnswerSave(qId, { respostaJson: data });
  };

  // ============ AI ============

  const handleAiAnalyze = async () => {
    setShowAiDialog(false);
    setAiLoading(true);
    setAiBanner(null);

    try {
      const perguntas = questions.map((q: any) => ({ id: q.id, texto: q.question_text }));

      const { data, error } = await supabase.functions.invoke('cs-autofill-answers', {
        body: { transcricao: transcricaoOnboardingConteudo, perguntas },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const answers = data?.respostas || {};
      let filledCount = 0;
      const newAiIds = new Set<string>();
      const newLocal: Record<string, any> = {};

      for (const [qId, answer] of Object.entries(answers)) {
        if (answer && typeof answer === 'string' && answer.trim()) {
          newLocal[qId] = { text: answer };
          newAiIds.add(qId);
          filledCount++;
          onAnswerBlur(qId, answer);
        }
      }

      setLocalAnswers(prev => ({ ...prev, ...newLocal }));
      setAiFilledIds(newAiIds);
      setAiBanner({ type: 'success', filled: filledCount, total: questions.length });
      onAiComplete(filledCount, questions.length);
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setAiBanner({ type: 'error' });
      toast({ title: 'Erro ao analisar transcrição', description: 'Verifique sua conexão e tente novamente.', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const hasTranscription = !!transcricaoOnboardingConteudo?.trim();
  const totalQ = visibleQuestions.length;

  const progressColorClass = answeredCount === 0
    ? 'text-destructive'
    : answeredCount < totalQ
      ? 'text-[hsl(var(--warning))]'
      : 'text-[hsl(var(--success))]';

  // ============ Render question field ============

  const renderQuestionField = (q: any) => {
    const ft = q.field_type;
    const jsonAns = getJsonAnswer(q.id);
    const isPrefill = prefillApplied.has(q.id);

    switch (ft) {
      case 'single_select':
        return (
          <SingleSelectField
            question={q}
            value={jsonAns?.select || ''}
            otherValue={jsonAns?.other || ''}
            onChange={(v, other) => handleSelectChange(q.id, v, other)}
            disabled={isConcluido}
          />
        );

      case 'multi_select':
        return (
          <MultiSelectField
            question={q}
            values={jsonAns?.multi || []}
            otherValue={jsonAns?.other || ''}
            onChange={(vals, other) => handleMultiChange(q.id, vals, other)}
            disabled={isConcluido}
          />
        );

      case 'toggle':
        return (
          <ToggleField
            value={jsonAns?.toggle ?? null}
            onChange={(v) => handleToggleChange(q.id, v)}
            disabled={isConcluido}
          />
        );

      case 'number':
        return (
          <NumberField
            value={jsonAns?.number ?? ''}
            onChange={(v) => handleNumberChange(q.id, v)}
            onBlur={() => handleNumberBlur(q.id)}
            disabled={isConcluido}
            mask={q.placeholder}
          />
        );

      case 'compound':
        return (
          <div className="space-y-3">
            {/* Main question as text if no sub_fields define it */}
            <CompoundField
              question={q}
              values={jsonAns?.compound || {}}
              onChange={(vals) => handleCompoundChange(q.id, vals)}
              disabled={isConcluido}
              isPrefilled={isPrefill}
            />
          </div>
        );

      default: // text, long_text, short_text
        return (
          <TextField
            question={q}
            value={getTextAnswer(q.id)}
            onChange={(v) => handleTextChange(q.id, v)}
            onBlur={() => handleTextBlur(q.id)}
            disabled={isConcluido}
            isPrefilled={isPrefill}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Reunião de Onboarding
        </h2>
        <div className="flex items-center gap-3">
          <span className={cn('text-[13px] font-semibold', progressColorClass)}>
            {answeredCount} de {totalQ} respondidas
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasTranscription || aiLoading || isConcluido}
                    onClick={() => hasTranscription && setShowAiDialog(true)}
                    className={cn(
                      'gap-2 text-[13px] font-semibold border rounded-lg transition-all duration-200',
                      hasTranscription
                        ? 'bg-[hsl(258,90%,66%,0.15)] border-[hsl(258,90%,66%,0.4)] text-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,66%,0.25)] hover:shadow-[0_0_16px_hsl(258,90%,66%,0.19)]'
                        : 'bg-muted border-border text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    Analisar com IA
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasTranscription && (
                <TooltipContent>Anexe a transcrição da reunião de onboarding para usar esta função</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* AI Progress / Result Banner */}
      {aiLoading && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(258,90%,66%,0.2)] bg-[hsl(258,90%,66%,0.1)]">
          <Sparkles className="h-4 w-4 text-[hsl(258,90%,66%)] animate-pulse" />
          <div className="flex-1">
            <p className="text-sm text-foreground">Analisando transcrição... isso pode levar alguns segundos.</p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-[hsl(258,90%,66%,0.2)]">
              <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: 'linear-gradient(90deg, hsl(258,90%,66%), #f43f5e)' }} />
            </div>
          </div>
        </div>
      )}

      {aiBanner?.type === 'success' && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-[hsl(var(--success)/0.2)] bg-[hsl(var(--success)/0.1)]">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
          <p className="text-sm text-foreground">
            IA preencheu {aiBanner.filled} de {aiBanner.total} perguntas com base na transcrição. Revise e ajuste conforme necessário.
          </p>
          <button onClick={() => setAiBanner(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            <AlertCircle className="h-3 w-3" />
          </button>
        </div>
      )}

      {aiBanner?.type === 'error' && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-foreground">Não foi possível analisar a transcrição. Tente novamente.</p>
          <button onClick={() => setAiBanner(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            <AlertCircle className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Questions Accordion */}
      <Accordion type="multiple" defaultValue={questionBlocks[0] ? [questionBlocks[0].key] : []}>
        {questionBlocks.map((block) => {
          const progress = getBlockProgress(block.questions);
          const isComplete = progress.answered === progress.total && progress.total > 0;

          return (
            <AccordionItem key={block.key} value={block.key} className="border rounded-xl mb-2 overflow-hidden">
              <AccordionTrigger className={cn(
                'px-4 py-3 hover:no-underline transition-colors',
                '[&[data-state=open]]:bg-secondary [&[data-state=open]]:border-b [&[data-state=open]]:border-border/50'
              )}>
                <div className="flex items-center gap-2 flex-1">
                  {isComplete && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />}
                  <span className="text-sm font-semibold text-foreground">{block.title}</span>
                  <span className={cn(
                    'ml-auto mr-2 text-[10px] font-semibold px-[7px] py-[2px] rounded-[10px] border',
                    isComplete
                      ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]'
                      : progress.answered > 0
                        ? 'bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.25)]'
                        : 'bg-muted text-muted-foreground border-border'
                  )}>
                    {progress.answered}/{progress.total}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-4 bg-card">
                <div className="space-y-0">
                  {block.questions.map((q: any, idx: number) => {
                    const visible = isQuestionVisible(q);

                    return (
                      <div
                        key={q.id}
                        className={cn(
                          'transition-all duration-200 ease-in-out overflow-hidden',
                          visible ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 py-0 my-0'
                        )}
                      >
                        <div className={cn(
                          'space-y-2 py-4',
                          idx < block.questions.length - 1 && 'border-b border-border/50'
                        )}>
                          <label className="text-[13px] font-medium text-muted-foreground flex items-center gap-1">
                            {q.question_text}
                            {q.is_required && <span className="text-destructive">*</span>}
                          </label>
                          {q.help_text && (
                            <p className="text-[11px] text-muted-foreground/70">{q.help_text}</p>
                          )}
                          {renderQuestionField(q)}
                          {aiFilledIds.has(q.id) && (
                            <div className="flex items-center gap-1 text-[10px] text-[hsl(258,90%,66%)]">
                              <Sparkles className="h-2.5 w-2.5" />
                              Preenchido por IA
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* AI Confirmation Dialog */}
      <AlertDialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[hsl(258,90%,66%)]" />
              Analisar transcrição com IA?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A IA irá ler a transcrição da reunião de onboarding e preencher as respostas das perguntas automaticamente.
              Respostas já preenchidas serão substituídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAiAnalyze} className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,56%)] gap-2">
              <Sparkles className="h-4 w-4" />
              Analisar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
