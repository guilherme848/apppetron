import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Upload,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import petronLogo from '@/assets/petron-logo.png';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface PublicProfile {
  id: string;
  title_public: string;
  department: string | null;
  seniority: string;
  contract_type: string;
  modality: string;
  base_city: string | null;
  mission: string | null;
  short_pitch: string | null;
  deliverables: string[];
  skills: { name: string; level?: string; required?: boolean }[];
  tools: { name: string; required?: boolean }[];
  requirements: string[];
  salary_range: string | null;
  requires_experience: boolean;
}

const SENIORITY_LABEL: Record<string, string> = {
  estagio: 'Estágio',
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  especialista: 'Especialista',
  lideranca: 'Liderança',
};

const MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  hibrido: 'Híbrido',
};

const CONTRACT_LABEL: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  freelancer: 'Freelancer',
  temporario: 'Temporário',
};

type Step = 'choose' | 'form';

type FormState = {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  linkedin_url: string;
  portfolio_url: string;
  presential_availability: string;
  tools_known: string[];
  salary_expectation: string;
  start_availability: string;
  experience_years: string;
  experience_summary: string;
  why_petron: string;
  accept_lgpd: boolean;
};

const INITIAL_STATE: FormState = {
  full_name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  linkedin_url: '',
  portfolio_url: '',
  presential_availability: '',
  tools_known: [],
  salary_expectation: '',
  start_availability: '',
  experience_years: '',
  experience_summary: '',
  why_petron: '',
  accept_lgpd: false,
};

export default function TrabalheConoscoPage() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('choose');
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await publicClient.rpc('hr_get_public_profiles');
      if (error) {
        console.error(error);
        setError('Erro ao carregar vagas');
      } else {
        setProfiles((data as PublicProfile[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  // Ferramentas agregadas da vaga selecionada (ou de todas, se nenhuma selecionada)
  const toolsForSelected = selectedProfile
    ? (selectedProfile.tools || []).map((t) => t.name).filter(Boolean)
    : [];

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const handleSelectProfile = (profile: PublicProfile) => {
    setSelectedProfile(profile);
    setError(null);
    setStep('form');
    // Scroll pro topo da etapa 2
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToChoose = () => {
    setStep('choose');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) {
      setError('Selecione uma vaga para se inscrever');
      return;
    }

    if (!form.full_name || form.full_name.length < 3) {
      setError('Preencha seu nome completo');
      return;
    }
    if (!form.email || !form.email.includes('@')) {
      setError('Preencha um email válido');
      return;
    }
    if (!form.phone || form.phone.length < 10) {
      setError('Preencha um telefone/WhatsApp válido');
      return;
    }
    if (!form.presential_availability) {
      setError('Informe sua disponibilidade para trabalho presencial');
      return;
    }
    if (!form.start_availability) {
      setError('Informe quando você pode começar');
      return;
    }
    if (!form.accept_lgpd) {
      setError('Você precisa aceitar a política de privacidade');
      return;
    }
    if (selectedProfile.requires_experience && !resumeFile) {
      setError('Esta vaga exige currículo/portfólio anexado');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let resumeUrl: string | null = null;
      let resumeFilename: string | null = null;
      if (resumeFile) {
        const path = `public-uploads/${selectedProfile.id}/${Date.now()}_${resumeFile.name.replace(
          /[^a-zA-Z0-9.-]/g,
          '_'
        )}`;
        const { error: uploadErr } = await publicClient.storage
          .from('hr-resumes')
          .upload(path, resumeFile, { upsert: false });
        if (uploadErr) {
          console.error(uploadErr);
          setError('Erro ao enviar currículo. Tente novamente.');
          setSubmitting(false);
          return;
        }
        const { data: signed } = await publicClient.storage
          .from('hr-resumes')
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        resumeUrl = signed?.signedUrl || path;
        resumeFilename = resumeFile.name;
      }

      const responses = [
        {
          field_key: 'presential_availability',
          label: 'Disponibilidade para trabalho presencial',
          value: form.presential_availability,
        },
        {
          field_key: 'tools_known',
          label: 'Ferramentas que sabe usar',
          value: form.tools_known,
        },
        {
          field_key: 'salary_expectation',
          label: 'Expectativa salarial',
          value: form.salary_expectation,
        },
        {
          field_key: 'start_availability',
          label: 'Quando pode começar',
          value: form.start_availability,
        },
        {
          field_key: 'experience_years',
          label: 'Anos de experiência na área',
          value: form.experience_years,
        },
        {
          field_key: 'experience_summary',
          label: 'Resumo da experiência',
          value: form.experience_summary,
        },
        {
          field_key: 'why_petron',
          label: 'Por que quer trabalhar na Petron?',
          value: form.why_petron,
        },
      ];

      const { data: result, error: rpcErr } = await publicClient.rpc(
        'hr_submit_unified_application',
        {
          p_profile_id: selectedProfile.id,
          p_candidate: {
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
            city: form.city,
            state: form.state,
            linkedin_url: form.linkedin_url,
            portfolio_url: form.portfolio_url,
          },
          p_responses: responses,
          p_resume_url: resumeUrl,
          p_resume_filename: resumeFilename,
          p_honeypot: honeypot || null,
        }
      );

      if (rpcErr) throw rpcErr;
      if (result && (result as any).success === false) {
        setError((result as any).error || 'Erro ao enviar');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao enviar inscrição');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Tela de sucesso ────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/12 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Inscrição enviada!</h1>
            <p className="text-muted-foreground mb-6">
              Recebemos seu cadastro para a vaga de <strong>{selectedProfile?.title_public}</strong>. Nossa equipe vai analisar e entrar em contato pelo WhatsApp em até 5 dias úteis.
            </p>
            <Button
              onClick={() => {
                setSubmitted(false);
                setSelectedProfile(null);
                setStep('choose');
                setForm(INITIAL_STATE);
                setResumeFile(null);
              }}
              variant="outline"
            >
              Ver outras vagas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={petronLogo} alt="Petron" className="h-8 w-auto" />
            <div>
              <div className="font-bold text-sm">Agência Petron</div>
              <div className="text-xs text-muted-foreground">Trabalhe conosco</div>
            </div>
          </div>
          <StepIndicator currentStep={step} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Nenhuma vaga aberta no momento</h2>
              <p className="text-muted-foreground">
                Acompanhe nossas redes sociais para ficar por dentro de novas oportunidades.
              </p>
            </CardContent>
          </Card>
        ) : step === 'choose' ? (
          // ═════════════════════ ETAPA 1: ESCOLHER VAGA ═════════════════════
          <div className="space-y-10">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/12 text-primary text-xs font-semibold mb-4">
                <Sparkles className="h-3 w-3" />
                {profiles.length} {profiles.length === 1 ? 'vaga aberta' : 'vagas abertas'}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Vem crescer com a gente.
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                A Petron é um time que vive de entregar resultado de verdade. Se você quer aprender rápido, ser dono do que faz e fazer parte de algo que tá crescendo todo mês — escolhe a vaga ali embaixo e bora trocar uma ideia.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Escolha a vaga que combina com você
                </h2>
                <span className="text-xs text-muted-foreground hidden md:block">
                  Passo 1 de 2
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfile(p)}
                    className="text-left p-5 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                        {p.title_public}
                      </h3>
                      {p.requires_experience && (
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          Exp. obrigatória
                        </Badge>
                      )}
                    </div>

                    {p.short_pitch && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {p.short_pitch}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs">
                      {p.department && <Badge variant="secondary">{p.department}</Badge>}
                      <Badge variant="secondary">{SENIORITY_LABEL[p.seniority]}</Badge>
                      <Badge variant="secondary">
                        <MapPin className="h-2.5 w-2.5 mr-1" />
                        {MODALITY_LABEL[p.modality]}
                      </Badge>
                      <Badge variant="secondary">{CONTRACT_LABEL[p.contract_type]}</Badge>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                      {p.salary_range ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          {p.salary_range}
                        </div>
                      ) : (
                        <div />
                      )}
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                        Me inscrever
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // ═════════════════════ ETAPA 2: FORMULÁRIO ═════════════════════
          selectedProfile && (
            <div className="space-y-6">
              {/* Breadcrumb + botão voltar */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={handleBackToChoose}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Trocar de vaga
                </Button>
                <span className="text-xs text-muted-foreground">Passo 2 de 2</span>
              </div>

              {/* Resumo da vaga selecionada */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="text-xs font-semibold uppercase text-primary mb-1">
                        Você está se inscrevendo para
                      </div>
                      <h2 className="text-xl font-bold leading-tight">
                        {selectedProfile.title_public}
                      </h2>
                    </div>
                    {selectedProfile.requires_experience && (
                      <Badge variant="outline" className="flex-shrink-0">
                        Exige experiência
                      </Badge>
                    )}
                  </div>

                  {selectedProfile.short_pitch && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedProfile.short_pitch}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {selectedProfile.department && (
                      <Badge variant="secondary">{selectedProfile.department}</Badge>
                    )}
                    <Badge variant="secondary">
                      {SENIORITY_LABEL[selectedProfile.seniority]}
                    </Badge>
                    <Badge variant="secondary">
                      <MapPin className="h-2.5 w-2.5 mr-1" />
                      {MODALITY_LABEL[selectedProfile.modality]}
                      {selectedProfile.base_city ? ` · ${selectedProfile.base_city}` : ''}
                    </Badge>
                    <Badge variant="secondary">
                      {CONTRACT_LABEL[selectedProfile.contract_type]}
                    </Badge>
                    {selectedProfile.salary_range && (
                      <Badge variant="secondary">
                        <DollarSign className="h-2.5 w-2.5 mr-1" />
                        {selectedProfile.salary_range}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes da vaga (expansível/colapsado — aqui sempre aberto) */}
              {(selectedProfile.mission ||
                (selectedProfile.deliverables && selectedProfile.deliverables.length > 0) ||
                (selectedProfile.requirements && selectedProfile.requirements.length > 0)) && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    Ver detalhes da vaga (missão, entregáveis, requisitos)
                  </summary>
                  <Card className="mt-3">
                    <CardContent className="p-5 md:p-6 space-y-5">
                      {selectedProfile.mission && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                            Missão
                          </h3>
                          <p className="text-sm leading-relaxed">
                            {selectedProfile.mission}
                          </p>
                        </div>
                      )}
                      {selectedProfile.deliverables &&
                        selectedProfile.deliverables.length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                              O que você vai entregar
                            </h3>
                            <ul className="space-y-1">
                              {selectedProfile.deliverables.map((d, i) => (
                                <li key={i} className="flex gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                  <span>{d}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {selectedProfile.requirements &&
                        selectedProfile.requirements.length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                              Requisitos
                            </h3>
                            <ul className="space-y-1">
                              {selectedProfile.requirements.map((r, i) => (
                                <li key={i} className="flex gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </details>
              )}

              {/* Formulário */}
              <Card>
                <CardContent className="p-6 md:p-8">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-1">Seus dados</h2>
                    <p className="text-sm text-muted-foreground">
                      Leva uns 3 minutos. Quanto mais completo, melhor a gente te entende.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Honeypot */}
                    <input
                      type="text"
                      name="website_url"
                      tabIndex={-1}
                      autoComplete="off"
                      style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />

                    {/* Dados pessoais */}
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dados pessoais
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>
                            Nome completo <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={form.full_name}
                            onChange={(e) => patch({ full_name: e.target.value })}
                            placeholder="João da Silva"
                          />
                        </div>
                        <div>
                          <Label>
                            E-mail <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="email"
                            value={form.email}
                            onChange={(e) => patch({ email: e.target.value })}
                            placeholder="joao@email.com"
                          />
                        </div>
                        <div>
                          <Label>
                            WhatsApp <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => patch({ phone: e.target.value })}
                            placeholder="(48) 99999-9999"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Cidade</Label>
                            <Input
                              value={form.city}
                              onChange={(e) => patch({ city: e.target.value })}
                              placeholder="Içara"
                            />
                          </div>
                          <div>
                            <Label>UF</Label>
                            <Input
                              value={form.state}
                              onChange={(e) =>
                                patch({ state: e.target.value.toUpperCase().slice(0, 2) })
                              }
                              placeholder="SC"
                              maxLength={2}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>LinkedIn</Label>
                          <Input
                            value={form.linkedin_url}
                            onChange={(e) => patch({ linkedin_url: e.target.value })}
                            placeholder="https://linkedin.com/in/seunome"
                          />
                        </div>
                        <div>
                          <Label>
                            Portfólio{' '}
                            {selectedProfile.requires_experience && (
                              <span className="text-destructive">*</span>
                            )}
                          </Label>
                          <Input
                            value={form.portfolio_url}
                            onChange={(e) => patch({ portfolio_url: e.target.value })}
                            placeholder="https://behance.net/..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Disponibilidade */}
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Disponibilidade & Expectativas
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>
                            Disponibilidade para trabalho presencial em Içara - SC{' '}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={form.presential_availability}
                            onValueChange={(v) => patch({ presential_availability: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim, moro em Içara ou região">
                                Sim, moro em Içara ou região
                              </SelectItem>
                              <SelectItem value="Sim, tenho disponibilidade para mudar">
                                Sim, posso mudar
                              </SelectItem>
                              <SelectItem value="Sim, moro em cidade vizinha (até 30km)">
                                Sim, moro em cidade vizinha (até 30km)
                              </SelectItem>
                              <SelectItem value="Não, só tenho disponibilidade remota">
                                Não, só remoto
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>
                            Quando pode começar? <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={form.start_availability}
                            onValueChange={(v) => patch({ start_availability: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Imediatamente">Imediatamente</SelectItem>
                              <SelectItem value="Em até 15 dias">Em até 15 dias</SelectItem>
                              <SelectItem value="Em até 30 dias">Em até 30 dias</SelectItem>
                              <SelectItem value="Em até 60 dias">Em até 60 dias</SelectItem>
                              <SelectItem value="Mais de 60 dias">Mais de 60 dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Expectativa salarial (R$)</Label>
                          <Input
                            value={form.salary_expectation}
                            onChange={(e) => patch({ salary_expectation: e.target.value })}
                            placeholder="Ex: R$ 2.500 - R$ 3.000"
                          />
                          {selectedProfile.salary_range && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Faixa da vaga: {selectedProfile.salary_range}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Anos de experiência na área</Label>
                          <Select
                            value={form.experience_years}
                            onValueChange={(v) => patch({ experience_years: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Nenhuma (quero começar)">
                                Nenhuma (quero começar)
                              </SelectItem>
                              <SelectItem value="Menos de 1 ano">Menos de 1 ano</SelectItem>
                              <SelectItem value="1 a 2 anos">1 a 2 anos</SelectItem>
                              <SelectItem value="2 a 4 anos">2 a 4 anos</SelectItem>
                              <SelectItem value="Mais de 4 anos">Mais de 4 anos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Ferramentas da vaga */}
                    {toolsForSelected.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Ferramentas que você sabe usar
                        </div>
                        <p className="text-xs text-muted-foreground -mt-1">
                          Marque as que você já utilizou, mesmo que seja só pra estudos.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {toolsForSelected.map((tool) => {
                            const checked = form.tools_known.includes(tool);
                            return (
                              <label
                                key={tool}
                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                  checked
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                                }`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(c) => {
                                    if (c) patch({ tools_known: [...form.tools_known, tool] });
                                    else
                                      patch({
                                        tools_known: form.tools_known.filter((t) => t !== tool),
                                      });
                                  }}
                                />
                                <span className="text-sm">{tool}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Conte sua história */}
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Conte sua história
                      </div>
                      <div>
                        <Label>Resumo da sua experiência profissional</Label>
                        <Textarea
                          value={form.experience_summary}
                          onChange={(e) => patch({ experience_summary: e.target.value })}
                          rows={4}
                          placeholder="Conte onde você trabalhou, o que fazia e quais resultados você gerou. Se não tem experiência, conte sobre projetos, cursos e motivação."
                        />
                      </div>
                      <div>
                        <Label>Por que quer trabalhar na Petron?</Label>
                        <Textarea
                          value={form.why_petron}
                          onChange={(e) => patch({ why_petron: e.target.value })}
                          rows={3}
                          placeholder="O que te atrai nessa vaga e na Petron?"
                        />
                      </div>
                    </div>

                    {/* Currículo */}
                    <div className="space-y-2">
                      <Label>
                        Anexe seu currículo{' '}
                        {selectedProfile.requires_experience && (
                          <span className="text-destructive">*</span>
                        )}
                      </Label>
                      <label className="flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          {resumeFile ? (
                            <>
                              <div className="text-sm font-medium">{resumeFile.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {(resumeFile.size / 1024 / 1024).toFixed(1)} MB
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm font-medium">Clique para enviar</div>
                              <div className="text-xs text-muted-foreground">
                                PDF, DOC, PNG ou JPG (máx 10MB)
                              </div>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>

                    {/* LGPD */}
                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
                      <Checkbox
                        id="lgpd"
                        checked={form.accept_lgpd}
                        onCheckedChange={(v) => patch({ accept_lgpd: !!v })}
                      />
                      <Label
                        htmlFor="lgpd"
                        className="text-xs font-normal cursor-pointer leading-relaxed"
                      >
                        Autorizo a Agência Petron a tratar meus dados pessoais para fins de recrutamento e seleção, conforme a LGPD. Meus dados serão usados apenas no processo seletivo e podem ser mantidos por até 1 ano para processos futuros.
                      </Label>
                    </div>

                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBackToChoose}
                        disabled={submitting}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                      </Button>
                      <Button type="submit" size="lg" className="flex-1" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            Enviar inscrição
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-20 py-6">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Agência Petron · Içara - SC · Seus dados estão protegidos pela LGPD
        </div>
      </footer>
    </div>
  );
}

// ─── Step indicator ─────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { key: 'choose' as Step, label: 'Escolher vaga', icon: Briefcase },
    { key: 'form' as Step, label: 'Se inscrever', icon: Users },
  ];

  return (
    <div className="hidden sm:flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = currentStep === s.key;
        const isDone =
          (currentStep === 'form' && s.key === 'choose');
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-primary/12 text-primary'
                  : isDone
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/50'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isDone
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
              </div>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className="w-4 h-px bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}
