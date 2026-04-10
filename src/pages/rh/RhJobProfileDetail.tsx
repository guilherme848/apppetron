import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Copy } from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
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
import type {
  HrJobProfile,
  HrJobProfileSkill,
  HrJobProfileTool,
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
  const { profiles, updateProfile } = useRh();

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
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/rh/vagas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
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
              Copiar link público
            </Button>
            <Button onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">{profile.title_internal}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Preencha os 3 blocos — quando ativar o toggle, esta vaga aparece publicamente em{' '}
                  <code className="text-primary">/trabalhe-conosco</code>
                </p>
              </div>

              {/* Toggle destacado: recebendo inscrições */}
              <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 min-w-[260px]">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Processo seletivo</div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {profile.accepting_applications ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Recebendo inscrições
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
                  onCheckedChange={(v) => patch({ accepting_applications: v })}
                />
              </div>
            </div>

            <Tabs defaultValue="basico">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="basico">Identidade</TabsTrigger>
                <TabsTrigger value="sobre">Sobre a vaga</TabsTrigger>
                <TabsTrigger value="skills">Skills & Ferramentas</TabsTrigger>
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
