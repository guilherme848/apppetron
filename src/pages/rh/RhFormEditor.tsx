import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Copy, ExternalLink } from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { HrForm, HrFormQuestion, HrQuestionType } from '@/types/rh';
import { QUESTION_TYPE_LABEL } from '@/types/rh';

export default function RhFormEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFormById, updateForm, upsertQuestions } = useRh();

  const [form, setForm] = useState<HrForm | null>(null);
  const [questions, setQuestions] = useState<HrFormQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await getFormById(id);
    if (data) {
      setForm(data.form);
      setQuestions(data.questions.length ? data.questions : defaultQuestions());
    }
  }, [id, getFormById]);

  useEffect(() => {
    load();
  }, [load]);

  const patchForm = (p: Partial<HrForm>) => {
    if (!form) return;
    setForm({ ...form, ...p });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await updateForm(form.id, {
        name: form.name,
        slug: form.slug,
        active: form.active,
        public: form.public,
        intro_text: form.intro_text,
        success_message: form.success_message,
        submit_button_text: form.submit_button_text,
        captcha_enabled: form.captcha_enabled,
        honeypot_enabled: form.honeypot_enabled,
        resume_required: form.resume_required,
        resume_formats: form.resume_formats,
        resume_max_mb: form.resume_max_mb,
        auto_ai_analysis: form.auto_ai_analysis,
        default_stage_order: form.default_stage_order,
        auto_tags: form.auto_tags,
      });
      await upsertQuestions(form.id, questions);
      toast.success('Formulário salvo');
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const newQ: any = {
      id: crypto.randomUUID(),
      form_id: form?.id || '',
      order_index: questions.length,
      field_key: `campo_${questions.length + 1}`,
      label: 'Nova pergunta',
      field_type: 'text',
      required: false,
      options: [],
      validation: {},
      help_text: null,
      placeholder: null,
      default_value: null,
      created_at: new Date().toISOString(),
    };
    setQuestions([...questions, newQ]);
    setDirty(true);
  };

  const updateQuestion = (idx: number, patch: Partial<HrFormQuestion>) => {
    const copy = [...questions];
    copy[idx] = { ...copy[idx], ...patch };
    setQuestions(copy);
    setDirty(true);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const publicUrl = form ? `${window.location.origin}/vagas/${form.slug}` : '';

  if (!form) {
    return (
      <RhLayout>
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </RhLayout>
    );
  }

  return (
    <RhLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/rh/formularios')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Formulários
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success('Link copiado');
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </Button>
            <Button variant="outline" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir público
              </a>
            </Button>
            <Button onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-semibold">{form.name}</h1>
              <div className="text-xs text-muted-foreground mt-1">
                <code className="bg-muted px-1.5 py-0.5 rounded">/vagas/{form.slug}</code>
              </div>
            </div>

            <Tabs defaultValue="geral">
              <TabsList>
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="perguntas">Perguntas</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="seguranca">Segurança</TabsTrigger>
                <TabsTrigger value="integracao">Integração</TabsTrigger>
              </TabsList>

              {/* ── GERAL ── */}
              <TabsContent value="geral" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nome do formulário</Label>
                    <Input value={form.name} onChange={(e) => patchForm({ name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Slug (URL)</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) =>
                        patchForm({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.active}
                      onCheckedChange={(v) => patchForm({ active: v })}
                    />
                    <Label>Ativo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.public}
                      onCheckedChange={(v) => patchForm({ public: v })}
                    />
                    <Label>Público</Label>
                  </div>
                </div>
                <div>
                  <Label>Texto de introdução</Label>
                  <Textarea
                    value={form.intro_text || ''}
                    onChange={(e) => patchForm({ intro_text: e.target.value })}
                    rows={3}
                    placeholder="Queremos te conhecer! É rápido :)"
                  />
                </div>
                <div>
                  <Label>Mensagem de sucesso</Label>
                  <Textarea
                    value={form.success_message || ''}
                    onChange={(e) => patchForm({ success_message: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Texto do botão de envio</Label>
                  <Input
                    value={form.submit_button_text || ''}
                    onChange={(e) => patchForm({ submit_button_text: e.target.value })}
                  />
                </div>
              </TabsContent>

              {/* ── PERGUNTAS ── */}
              <TabsContent value="perguntas" className="space-y-3 mt-4">
                {questions.map((q, i) => (
                  <Card key={q.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">#{i + 1}</span>
                        <Input
                          className="flex-1"
                          value={q.label}
                          onChange={(e) => updateQuestion(i, { label: e.target.value })}
                          placeholder="Pergunta"
                        />
                        <Select
                          value={q.field_type}
                          onValueChange={(v: HrQuestionType) => updateQuestion(i, { field_type: v })}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(QUESTION_TYPE_LABEL).map(([v, l]) => (
                              <SelectItem key={v} value={v}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={q.required}
                            onCheckedChange={(v) => updateQuestion(i, { required: v })}
                          />
                          <span className="text-xs text-muted-foreground">Obrig.</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Chave técnica (field_key)"
                          value={q.field_key}
                          onChange={(e) =>
                            updateQuestion(i, {
                              field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                            })
                          }
                        />
                        <Input
                          placeholder="Placeholder"
                          value={q.placeholder || ''}
                          onChange={(e) => updateQuestion(i, { placeholder: e.target.value })}
                        />
                      </div>
                      {(q.field_type === 'select' || q.field_type === 'multiselect') && (
                        <Textarea
                          placeholder="Opções (1 por linha)"
                          value={(q.options || []).map((o: any) => o.label).join('\n')}
                          onChange={(e) =>
                            updateQuestion(i, {
                              options: e.target.value
                                .split('\n')
                                .map((l) => l.trim())
                                .filter(Boolean)
                                .map((l) => ({ value: l, label: l })),
                            })
                          }
                          rows={3}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar pergunta
                </Button>
              </TabsContent>

              {/* ── UPLOAD ── */}
              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.resume_required}
                    onCheckedChange={(v) => patchForm({ resume_required: v })}
                  />
                  <Label>Currículo obrigatório</Label>
                </div>
                <div>
                  <Label>Formatos aceitos</Label>
                  <Input
                    value={form.resume_formats.join(', ')}
                    onChange={(e) =>
                      patchForm({
                        resume_formats: e.target.value.split(',').map((s) => s.trim().toLowerCase()),
                      })
                    }
                    placeholder="pdf, doc, docx, png, jpg"
                  />
                </div>
                <div>
                  <Label>Tamanho máximo (MB)</Label>
                  <Input
                    type="number"
                    value={form.resume_max_mb}
                    onChange={(e) => patchForm({ resume_max_mb: Number(e.target.value) })}
                  />
                </div>
              </TabsContent>

              {/* ── SEGURANÇA ── */}
              <TabsContent value="seguranca" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.captcha_enabled}
                    onCheckedChange={(v) => patchForm({ captcha_enabled: v })}
                  />
                  <Label>Captcha (requer configuração adicional)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.honeypot_enabled}
                    onCheckedChange={(v) => patchForm({ honeypot_enabled: v })}
                  />
                  <Label>Honeypot (campo oculto anti-bot)</Label>
                </div>
              </TabsContent>

              {/* ── INTEGRAÇÃO ── */}
              <TabsContent value="integracao" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.auto_ai_analysis}
                    onCheckedChange={(v) => patchForm({ auto_ai_analysis: v })}
                  />
                  <Label>Iniciar análise IA automática ao receber inscrição</Label>
                </div>
                <div>
                  <Label>Etapa inicial do pipeline (índice 0, 1, 2...)</Label>
                  <Input
                    type="number"
                    value={form.default_stage_order}
                    onChange={(e) => patchForm({ default_stage_order: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Tags automáticas (separadas por vírgula)</Label>
                  <Input
                    value={(form.auto_tags || []).join(', ')}
                    onChange={(e) =>
                      patchForm({
                        auto_tags: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </RhLayout>
  );
}

function defaultQuestions(): HrFormQuestion[] {
  const now = new Date().toISOString();
  const base = {
    form_id: '',
    options: [],
    validation: {},
    help_text: null,
    default_value: null,
    created_at: now,
  };
  return [
    {
      ...base,
      id: crypto.randomUUID(),
      order_index: 0,
      field_key: 'full_name',
      label: 'Qual é o seu nome completo?',
      placeholder: 'João Silva',
      field_type: 'text',
      required: true,
    },
    {
      ...base,
      id: crypto.randomUUID(),
      order_index: 1,
      field_key: 'email',
      label: 'Qual é o seu e-mail?',
      placeholder: 'joao@email.com',
      field_type: 'email',
      required: true,
    },
    {
      ...base,
      id: crypto.randomUUID(),
      order_index: 2,
      field_key: 'phone',
      label: 'Qual é o seu WhatsApp?',
      placeholder: '(11) 99999-9999',
      field_type: 'phone',
      required: true,
    },
  ] as any;
}
