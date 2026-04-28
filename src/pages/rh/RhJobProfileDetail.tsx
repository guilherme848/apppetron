import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  Pencil,
  KanbanSquare,
  ClipboardList,
  Lock,
} from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { JobKanban } from '@/components/rh/JobKanban';
import { useRh } from '@/contexts/RhContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { JobProfileEvaluationConfig } from '@/components/rh/JobProfileEvaluationConfig';
import {
  DEFAULT_FIELD_REQUIREMENTS,
  FIELD_REQUIREMENT_LABELS,
  type HrJobProfile,
  type HrJobProfileSkill,
  type HrJobProfileTool,
  type HrFieldRequirements,
  type HrPublicFormField,
} from '@/types/rh';

const DEPARTMENTS = [
  'Operações',
  'Comercial',
  'Marketing',
  'Customer Success',
  'Produto',
  'Tecnologia',
  'Financeiro',
  'RH',
];

export default function RhJobProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profiles, updateProfile, applications, jobs } = useRh();

  const view = (searchParams.get('view') as 'edit' | 'kanban') || 'kanban';

  const [profile, setProfile] = useState<HrJobProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const found = profiles.find((p) => p.id === id);
    if (found) setProfile(found);
  }, [id, profiles]);

  // Contar candidatos desta vaga via jobs → applications
  const candidatesCount = (() => {
    const job = jobs.find((j) => j.job_profile_id === id);
    if (!job) return 0;
    return applications.filter((a) => a.job_id === job.id).length;
  })();

  const setView = (v: 'edit' | 'kanban') => {
    const params = new URLSearchParams(searchParams);
    params.set('view', v);
    setSearchParams(params, { replace: true });
  };

  const patch = (patch: Partial<HrJobProfile>) => {
    if (!profile) return;
    setProfile({ ...profile, ...patch });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        title_internal: profile.title_internal,
        title_public: profile.title_public,
        department: profile.department,
        seniority: profile.seniority,
        contract_type: profile.contract_type,
        modality: profile.modality,
        base_city: profile.base_city,
        synonyms: profile.synonyms,
        mission: profile.mission,
        short_pitch: profile.short_pitch,
        deliverables: profile.deliverables,
        skills: profile.skills,
        tools: profile.tools,
        requirements: profile.requirements,
        notes: profile.notes,
        status: profile.status,
        accepting_applications: profile.accepting_applications,
        requires_experience: profile.requires_experience,
        salary_range: profile.salary_range,
        field_requirements: profile.field_requirements,
      });
      toast.success('Vaga salva');
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <RhLayout>
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </RhLayout>
    );
  }

  const publicUrl = `${window.location.origin}/trabalhe-conosco`;

  return (
    <RhLayout>
      <div className="space-y-4">
        {/* Top actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" onClick={() => navigate('/rh/vagas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success('Link copiado');
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar link público
            </Button>
            {view === 'edit' && (
              <Button onClick={handleSave} disabled={saving || !dirty}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </div>

        {/* Header da vaga + view switcher + status toggle */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold truncate">{profile.title_internal}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.department || 'Vaga'} ·{' '}
                  {candidatesCount === 0
                    ? 'Sem candidatos ainda'
                    : candidatesCount === 1
                    ? '1 candidato inscrito'
                    : `${candidatesCount} candidatos inscritos`}
                </p>
              </div>

              {/* Toggle destacado: recebendo inscrições */}
              <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 min-w-[240px]">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Processo seletivo</div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {profile.accepting_applications ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Recebendo
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        Fechado
                      </>
                    )}
                  </div>
                </div>
                <Switch
                  checked={profile.accepting_applications}
                  onCheckedChange={async (v) => {
                    patch({ accepting_applications: v });
                    // Auto-save quando o toggle muda (UX melhor)
                    try {
                      await updateProfile(profile.id, { accepting_applications: v });
                      toast.success(v ? 'Processo aberto' : 'Processo fechado');
                    } catch (e: any) {
                      toast.error(e.message || 'Erro');
                    }
                  }}
                />
              </div>
            </div>

            {/* View Switcher — Kanban / Editar */}
            <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border">
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  view === 'kanban'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <KanbanSquare className="h-4 w-4" />
                Candidatos
                {candidatesCount > 0 && (
                  <Badge variant="secondary" className="h-5 ml-0.5 text-[10px]">
                    {candidatesCount}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setView('edit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  view === 'edit'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Pencil className="h-4 w-4" />
                Editar vaga
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo: Kanban ou Editor */}
        {view === 'kanban' ? (
          <Card>
            <CardContent className="p-6">
              <JobKanban profileId={profile.id} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">

            <Tabs defaultValue="basico">
              <TabsList className="grid grid-cols-5 mb-6">
                <TabsTrigger value="basico">Identidade</TabsTrigger>
                <TabsTrigger value="sobre">Sobre a vaga</TabsTrigger>
                <TabsTrigger value="skills">Skills & Ferramentas</TabsTrigger>
                <TabsTrigger value="avaliacao">Avaliação</TabsTrigger>
                <TabsTrigger value="formulario">Formulário</TabsTrigger>
              </TabsList>

              {/* ═══════════════ IDENTIDADE ═══════════════ */}
              <TabsContent value="basico" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Título interno *</Label>
                    <Input
                      value={profile.title_internal}
                      onChange={(e) => patch({ title_internal: e.target.value })}
                      placeholder="Ex: Gestor de Tráfego Pleno"
                    />
                  </div>
                  <div>
                    <Label>Título público *</Label>
                    <Input
                      value={profile.title_public}
                      onChange={(e) => patch({ title_public: e.target.value })}
                      placeholder="Como aparece na vaga pública"
                    />
                  </div>
                  <div>
                    <Label>Departamento</Label>
                    <Select
                      value={profile.department || undefined}
                      onValueChange={(v) => patch({ department: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Senioridade</Label>
                    <Select
                      value={profile.seniority}
                      onValueChange={(v: any) => patch({ seniority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estagio">Estágio</SelectItem>
                        <SelectItem value="junior">Júnior</SelectItem>
                        <SelectItem value="pleno">Pleno</SelectItem>
                        <SelectItem value="senior">Sênior</SelectItem>
                        <SelectItem value="especialista">Especialista</SelectItem>
                        <SelectItem value="lideranca">Liderança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de contrato</Label>
                    <Select
                      value={profile.contract_type}
                      onValueChange={(v: any) => patch({ contract_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clt">CLT</SelectItem>
                        <SelectItem value="pj">PJ</SelectItem>
                        <SelectItem value="estagio">Estágio</SelectItem>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                        <SelectItem value="temporario">Temporário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Modalidade</Label>
                    <Select
                      value={profile.modality}
                      onValueChange={(v: any) => patch({ modality: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="remoto">Remoto</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cidade base</Label>
                    <Input
                      value={profile.base_city || ''}
                      onChange={(e) => patch({ base_city: e.target.value })}
                      placeholder="Ex: Içara - SC"
                    />
                  </div>
                  <div>
                    <Label>Faixa salarial (exibida no formulário público)</Label>
                    <Input
                      value={profile.salary_range || ''}
                      onChange={(e) => patch({ salary_range: e.target.value })}
                      placeholder="Ex: R$ 2.000 - R$ 3.500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  <Switch
                    checked={profile.requires_experience}
                    onCheckedChange={(v) => patch({ requires_experience: v })}
                  />
                  <div>
                    <Label className="cursor-pointer">Exige experiência comprovada</Label>
                    <p className="text-xs text-muted-foreground">
                      Use para Designer, Videomaker e outras funções onde portfólio é obrigatório
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Pitch curto (1 frase — aparece no card da página pública)</Label>
                  <Input
                    value={profile.short_pitch || ''}
                    onChange={(e) => patch({ short_pitch: e.target.value })}
                    placeholder="Ex: Porta de entrada para vendas B2B. Aceita sem experiência."
                    maxLength={120}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(profile.short_pitch || '').length}/120
                  </p>
                </div>
              </TabsContent>

              {/* ═══════════════ SOBRE A VAGA ═══════════════ */}
              <TabsContent value="sobre" className="space-y-4">
                <div>
                  <Label>Missão da vaga</Label>
                  <Textarea
                    value={profile.mission || ''}
                    onChange={(e) => patch({ mission: e.target.value })}
                    rows={5}
                    placeholder="Descreva em 1-2 parágrafos o que essa pessoa entrega de valor."
                  />
                </div>

                <StringListEditor
                  label="Entregáveis (o que ela precisa entregar)"
                  placeholder="Ex: 30+ reuniões qualificadas por mês"
                  values={profile.deliverables}
                  onChange={(deliverables) => patch({ deliverables })}
                />

                <StringListEditor
                  label="Requisitos obrigatórios"
                  placeholder="Ex: Ensino superior cursando ou completo"
                  values={profile.requirements}
                  onChange={(requirements) => patch({ requirements })}
                />

                <div>
                  <Label>Notas internas (não aparece pro candidato)</Label>
                  <Textarea
                    value={profile.notes || ''}
                    onChange={(e) => patch({ notes: e.target.value })}
                    rows={3}
                    placeholder="Observações do RH — trilha de carreira, comissões, histórico..."
                  />
                </div>
              </TabsContent>

              {/* ═══════════════ SKILLS ═══════════════ */}
              <TabsContent value="skills" className="space-y-6">
                <SkillsEditor
                  skills={profile.skills}
                  onChange={(skills) => patch({ skills })}
                />
                <ToolsEditor
                  tools={profile.tools}
                  onChange={(tools) => patch({ tools })}
                />
              </TabsContent>

              {/* ═══════════════ AVALIAÇÃO (Target DISC + competências + roteiro + teste técnico) ═══════════════ */}
              <TabsContent value="avaliacao" className="space-y-4">
                <JobProfileEvaluationConfig
                  targetDisc={profile.target_disc}
                  competencies={profile.competencies}
                  interviewScript={profile.interview_script}
                  technicalTest={profile.technical_test}
                  onChange={(p) => patch(p)}
                />
              </TabsContent>

              {/* ═══════════════ FORMULÁRIO (obrigatoriedade) ═══════════════ */}
              <TabsContent value="formulario" className="space-y-4">
                <FieldRequirementsEditor
                  value={profile.field_requirements}
                  onChange={(field_requirements) => patch({ field_requirements })}
                  requiresExperience={profile.requires_experience}
                />
              </TabsContent>
            </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </RhLayout>
  );
}

// ─── EDITORES DE LISTA REUTILIZÁVEIS ──────────────────────────────

function StringListEditor({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            onChange={(e) => {
              const copy = [...values];
              copy[i] = e.target.value;
              onChange(copy);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...values, ''])}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar
      </Button>
      {values.length === 0 && (
        <p className="text-xs text-muted-foreground italic">{placeholder}</p>
      )}
    </div>
  );
}

function SkillsEditor({
  skills,
  onChange,
}: {
  skills: HrJobProfileSkill[];
  onChange: (s: HrJobProfileSkill[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Skills (competências)</Label>
      {skills.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={s.name}
            placeholder="Nome da skill (ex: Meta Ads, Copywriting)"
            onChange={(e) => {
              const copy = [...skills];
              copy[i] = { ...copy[i], name: e.target.value };
              onChange(copy);
            }}
          />
          <Select
            value={s.level || 'intermediate'}
            onValueChange={(v: any) => {
              const copy = [...skills];
              copy[i] = { ...copy[i], level: v };
              onChange(copy);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Básico</SelectItem>
              <SelectItem value="intermediate">Intermediário</SelectItem>
              <SelectItem value="advanced">Avançado</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(skills.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...skills, { name: '', level: 'intermediate', required: true }])}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar skill
      </Button>
    </div>
  );
}

function ToolsEditor({
  tools,
  onChange,
}: {
  tools: HrJobProfileTool[];
  onChange: (t: HrJobProfileTool[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Ferramentas</Label>
      {tools.map((t, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={t.name}
            placeholder="Ex: Meta Business, Google Ads, Figma"
            onChange={(e) => {
              const copy = [...tools];
              copy[i] = { ...copy[i], name: e.target.value };
              onChange(copy);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(tools.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...tools, { name: '', required: true }])}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar ferramenta
      </Button>
    </div>
  );
}

// ─── EDITOR DE OBRIGATORIEDADE DO FORMULÁRIO PÚBLICO ──────────────

const FIELD_GROUPS: { title: string; fields: HrPublicFormField[] }[] = [
  {
    title: 'Identificação',
    fields: ['full_name', 'email', 'phone', 'city', 'state', 'portfolio_url'],
  },
  {
    title: 'Triagem da vaga',
    fields: ['presential_availability', 'start_availability', 'salary_expectation'],
  },
  {
    title: 'Experiência',
    fields: ['experience_years', 'experience_summary', 'tools_known', 'why_petron'],
  },
  {
    title: 'Anexos & consentimento',
    fields: ['resume', 'accept_lgpd'],
  },
];

function FieldRequirementsEditor({
  value,
  onChange,
  requiresExperience,
}: {
  value: HrFieldRequirements;
  onChange: (v: HrFieldRequirements) => void;
  requiresExperience: boolean;
}) {
  // Merge com defaults caso venha vazio do DB em vagas antigas
  const effective: HrFieldRequirements = { ...DEFAULT_FIELD_REQUIREMENTS, ...(value || {}) };

  const toggle = (field: HrPublicFormField, next: boolean) => {
    onChange({ ...effective, [field]: next });
  };

  const requiredCount = Object.values(effective).filter(Boolean).length;
  const totalCount = Object.keys(FIELD_REQUIREMENT_LABELS).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap p-4 bg-muted/40 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" />
            Obrigatoriedade por pergunta
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Controle quais campos do formulário público de inscrição são obrigatórios.
            Campos trancados são sempre obrigatórios por regra do sistema.
          </p>
        </div>
        <Badge variant="secondary" className="h-6">
          {requiredCount}/{totalCount} obrigatórios
        </Badge>
      </div>

      {FIELD_GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold px-1">
            {group.title}
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {group.fields.map((field) => {
              const meta = FIELD_REQUIREMENT_LABELS[field];
              const isLocked = !!meta.locked;
              const forcedByResume = field === 'resume' && requiresExperience;
              const checked = isLocked ? true : forcedByResume ? true : !!effective[field];
              return (
                <div key={field} className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {meta.label}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Fixo
                        </span>
                      )}
                    </div>
                    {(meta.hint || forcedByResume) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {forcedByResume
                          ? 'Forçado obrigatório: a vaga exige experiência comprovada (requires_experience=true).'
                          : meta.hint}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={checked}
                    disabled={isLocked || forcedByResume}
                    onCheckedChange={(v) => toggle(field, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="text-xs text-muted-foreground px-1">
        As mudanças só ficam ativas após clicar em <strong>Salvar</strong> no topo.
      </div>
    </div>
  );
}
