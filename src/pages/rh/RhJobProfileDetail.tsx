import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Rocket } from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type {
  HrJobProfile,
  HrJobProfileProcessStep,
  HrJobProfileSkill,
  HrJobProfileTool,
  HrJobProfilePlan30Item,
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
  const { profiles, updateProfile, createJobFromProfile } = useRh();

  const [profile, setProfile] = useState<HrJobProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const found = profiles.find((p) => p.id === id);
    if (found) setProfile(found);
  }, [id, profiles]);

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
        manager_member_id: profile.manager_member_id,
        synonyms: profile.synonyms,
        mission: profile.mission,
        deliverables: profile.deliverables,
        skills: profile.skills,
        tools: profile.tools,
        requirements: profile.requirements,
        process: profile.process,
        plan_30: profile.plan_30,
        notes: profile.notes,
        status: profile.status,
      });
      toast.success('Função salva');
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateJob = async () => {
    if (!profile) return;
    if (dirty) {
      toast.warning('Salve as alterações antes de criar uma vaga.');
      return;
    }
    try {
      const jobId = await createJobFromProfile(profile.id);
      toast.success('Vaga criada a partir desta função');
      navigate(`/rh/vagas/${jobId}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar vaga');
    }
  };

  if (!profile) {
    return (
      <RhLayout>
        <div className="text-center py-12 text-muted-foreground">Carregando função...</div>
      </RhLayout>
    );
  }

  return (
    <RhLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/rh/funcoes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCreateJob}>
              <Rocket className="h-4 w-4 mr-2" />
              Criar Vaga
            </Button>
            <Button onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">{profile.title_internal}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Editor completo da função — preencha todas as abas para criar um perfil rico.
              </p>
            </div>

            <Tabs defaultValue="identidade">
              <TabsList className="grid grid-cols-3 md:grid-cols-9 mb-6">
                <TabsTrigger value="identidade">Identidade</TabsTrigger>
                <TabsTrigger value="missao">Missão</TabsTrigger>
                <TabsTrigger value="entregaveis">Entregáveis</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="ferramentas">Ferramentas</TabsTrigger>
                <TabsTrigger value="requisitos">Requisitos</TabsTrigger>
                <TabsTrigger value="processo">Processo</TabsTrigger>
                <TabsTrigger value="plano30">Plano 30</TabsTrigger>
                <TabsTrigger value="notas">Notas</TabsTrigger>
              </TabsList>

              {/* Identidade */}
              <TabsContent value="identidade" className="space-y-4">
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
                    <Label>Sinônimos (separados por vírgula)</Label>
                    <Input
                      value={(profile.synonyms || []).join(', ')}
                      onChange={(e) =>
                        patch({
                          synonyms: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Ex: Traffic Manager, Gestor de Mídia"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Missão */}
              <TabsContent value="missao" className="space-y-4">
                <div>
                  <Label>Missão da função</Label>
                  <Textarea
                    value={profile.mission || ''}
                    onChange={(e) => patch({ mission: e.target.value })}
                    rows={8}
                    placeholder="Descreva a missão da função em 1-2 parágrafos. O que essa pessoa entrega de valor para a empresa?"
                  />
                </div>
              </TabsContent>

              {/* Entregáveis */}
              <TabsContent value="entregaveis">
                <StringListEditor
                  label="Entregáveis"
                  placeholder="Ex: Gerenciar X contas por mês"
                  values={profile.deliverables}
                  onChange={(deliverables) => patch({ deliverables })}
                />
              </TabsContent>

              {/* Skills */}
              <TabsContent value="skills">
                <SkillsEditor
                  skills={profile.skills}
                  onChange={(skills) => patch({ skills })}
                />
              </TabsContent>

              {/* Ferramentas */}
              <TabsContent value="ferramentas">
                <ToolsEditor tools={profile.tools} onChange={(tools) => patch({ tools })} />
              </TabsContent>

              {/* Requisitos */}
              <TabsContent value="requisitos">
                <StringListEditor
                  label="Requisitos"
                  placeholder="Ex: Experiência mínima de 2 anos com Meta Ads"
                  values={profile.requirements}
                  onChange={(requirements) => patch({ requirements })}
                />
              </TabsContent>

              {/* Processo */}
              <TabsContent value="processo">
                <ProcessEditor
                  steps={profile.process}
                  onChange={(process) => patch({ process })}
                />
              </TabsContent>

              {/* Plano 30 */}
              <TabsContent value="plano30">
                <Plan30Editor plan={profile.plan_30} onChange={(plan_30) => patch({ plan_30 })} />
              </TabsContent>

              {/* Notas */}
              <TabsContent value="notas">
                <div>
                  <Label>Notas internas</Label>
                  <Textarea
                    value={profile.notes || ''}
                    onChange={(e) => patch({ notes: e.target.value })}
                    rows={10}
                    placeholder="Observações, contexto extra, histórico..."
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
      <Button variant="outline" onClick={() => onChange([...values, ''])}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar item
      </Button>
      {values.length === 0 && (
        <p className="text-sm text-muted-foreground italic">{placeholder}</p>
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
      <Label>Skills</Label>
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
        onClick={() =>
          onChange([...skills, { name: '', level: 'intermediate', required: true }])
        }
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
      <Button variant="outline" onClick={() => onChange([...tools, { name: '', required: true }])}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar ferramenta
      </Button>
    </div>
  );
}

function ProcessEditor({
  steps,
  onChange,
}: {
  steps: HrJobProfileProcessStep[];
  onChange: (s: HrJobProfileProcessStep[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Etapas do processo seletivo (informativo — pipeline real é editado na vaga)</Label>
      {steps.map((s, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={s.name}
            placeholder="Ex: Entrevista técnica"
            onChange={(e) => {
              const copy = [...steps];
              copy[i] = { ...copy[i], name: e.target.value };
              onChange(copy);
            }}
          />
          <Input
            value={s.description || ''}
            placeholder="Descrição (opcional)"
            onChange={(e) => {
              const copy = [...steps];
              copy[i] = { ...copy[i], description: e.target.value };
              onChange(copy);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(steps.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() => onChange([...steps, { name: '', description: '' }])}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar etapa
      </Button>
    </div>
  );
}

function Plan30Editor({
  plan,
  onChange,
}: {
  plan: HrJobProfilePlan30Item[];
  onChange: (p: HrJobProfilePlan30Item[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Plano 30 dias (onboarding do novo contratado)</Label>
      {plan.map((p, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <Input
            className="col-span-2"
            type="number"
            value={p.day}
            placeholder="Dia"
            onChange={(e) => {
              const copy = [...plan];
              copy[i] = { ...copy[i], day: Number(e.target.value) };
              onChange(copy);
            }}
          />
          <Input
            className="col-span-5"
            value={p.goal}
            placeholder="Meta/objetivo"
            onChange={(e) => {
              const copy = [...plan];
              copy[i] = { ...copy[i], goal: e.target.value };
              onChange(copy);
            }}
          />
          <Input
            className="col-span-4"
            value={p.kpi || ''}
            placeholder="KPI"
            onChange={(e) => {
              const copy = [...plan];
              copy[i] = { ...copy[i], kpi: e.target.value };
              onChange(copy);
            }}
          />
          <Button
            className="col-span-1"
            variant="ghost"
            size="icon"
            onClick={() => onChange(plan.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={() => onChange([...plan, { day: 30, goal: '', kpi: '' }])}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar marco
      </Button>
    </div>
  );
}
