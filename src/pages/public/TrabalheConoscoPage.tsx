import { useEffect, useState, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  Upload,
  Briefcase,
  Clock,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Zap,
  ChevronDown,
  TrendingUp,
  Flame,
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
import petronLogo from '@/assets/petron-logo.png';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type PublicFormFieldKey =
  | 'full_name'
  | 'email'
  | 'phone'
  | 'city'
  | 'state'
  | 'portfolio_url'
  | 'presential_availability'
  | 'tools_known'
  | 'salary_expectation'
  | 'start_availability'
  | 'experience_years'
  | 'experience_summary'
  | 'why_petron'
  | 'accept_lgpd'
  | 'resume';

type PublicFieldRequirements = Partial<Record<PublicFormFieldKey, boolean>>;

const DEFAULT_PUBLIC_FIELD_REQUIREMENTS: Record<PublicFormFieldKey, boolean> = {
  full_name: true,
  email: true,
  phone: true,
  city: false,
  state: false,
  portfolio_url: false,
  presential_availability: true,
  tools_known: false,
  salary_expectation: false,
  start_availability: true,
  experience_years: false,
  experience_summary: false,
  why_petron: false,
  accept_lgpd: true,
  resume: false,
};

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
  field_requirements?: PublicFieldRequirements;
}

function resolveRequirements(profile: PublicProfile | null): Record<PublicFormFieldKey, boolean> {
  if (!profile) return { ...DEFAULT_PUBLIC_FIELD_REQUIREMENTS };
  const merged = { ...DEFAULT_PUBLIC_FIELD_REQUIREMENTS, ...(profile.field_requirements || {}) };
  // full_name, email, accept_lgpd sempre obrigatórios (regra do sistema)
  merged.full_name = true;
  merged.email = true;
  merged.accept_lgpd = true;
  // Se a vaga exige experiência comprovada, currículo é obrigatório
  if (profile.requires_experience) merged.resume = true;
  return merged;
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

const isDesignerRole = (profile: PublicProfile | null): boolean =>
  !!profile && profile.title_public.toLowerCase().includes('designer');

// ═══════════════ ANIMATION VARIANTS ════════════════════════════════

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

// ═══════════════════════════════════════════════════════════════════

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
  const prefersReducedMotion = useReducedMotion();

  // Mouse parallax pra orbs do background
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  const orb1X = useTransform(springX, [0, 1], [-20, 20]);
  const orb1Y = useTransform(springY, [0, 1], [-20, 20]);
  const orb2X = useTransform(springX, [0, 1], [15, -15]);
  const orb2Y = useTransform(springY, [0, 1], [15, -15]);

  // Scroll progress
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

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

  useEffect(() => {
    if (prefersReducedMotion) return;
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [mouseX, mouseY, prefersReducedMotion]);

  const toolsForSelected = selectedProfile
    ? (selectedProfile.tools || []).map((t) => t.name).filter(Boolean)
    : [];

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const handleSelectProfile = (profile: PublicProfile) => {
    setSelectedProfile(profile);
    setError(null);
    setStep('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToChoose = () => {
    setStep('choose');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    const req = resolveRequirements(selectedProfile);

    // Sempre validamos formato quando o campo é preenchido; só bloqueamos
    // vazio quando o campo está marcado como obrigatório pela vaga.
    if (req.full_name && (!form.full_name || form.full_name.length < 3)) {
      setError('Preencha seu nome completo');
      return;
    }
    if (req.email && (!form.email || !form.email.includes('@'))) {
      setError('Preencha um email válido');
      return;
    }
    if (form.email && !form.email.includes('@')) {
      setError('E-mail inválido');
      return;
    }
    if (req.phone && (!form.phone || form.phone.length < 10)) {
      setError('Preencha um telefone/WhatsApp válido');
      return;
    }
    if (req.city && !form.city) {
      setError('Informe sua cidade');
      return;
    }
    if (req.state && !form.state) {
      setError('Informe seu estado (UF)');
      return;
    }
    if (req.portfolio_url && !form.portfolio_url) {
      setError('Informe o link do portfólio / LinkedIn');
      return;
    }
    if (req.presential_availability && !form.presential_availability) {
      setError('Informe sua disponibilidade para trabalho presencial');
      return;
    }
    if (req.tools_known && form.tools_known.length === 0) {
      setError('Selecione ao menos uma ferramenta que você já usa');
      return;
    }
    if (req.salary_expectation && !form.salary_expectation) {
      setError('Informe sua expectativa salarial');
      return;
    }
    if (req.start_availability && !form.start_availability) {
      setError('Informe quando você pode começar');
      return;
    }
    if (req.experience_years && !form.experience_years) {
      setError('Informe seus anos de experiência');
      return;
    }
    if (req.experience_summary && (!form.experience_summary || form.experience_summary.length < 10)) {
      setError('Escreva um resumo breve da sua experiência');
      return;
    }
    if (req.why_petron && (!form.why_petron || form.why_petron.length < 10)) {
      setError('Conte por que você quer trabalhar aqui');
      return;
    }
    if (req.accept_lgpd && !form.accept_lgpd) {
      setError('Você precisa aceitar a política de privacidade');
      return;
    }
    if (req.resume && !resumeFile) {
      setError('Esta vaga exige currículo anexado');
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
        { field_key: 'presential_availability', label: 'Disponibilidade para trabalho presencial', value: form.presential_availability },
        { field_key: 'tools_known', label: 'Ferramentas que sabe usar', value: form.tools_known },
        { field_key: 'salary_expectation', label: 'Expectativa salarial', value: form.salary_expectation },
        { field_key: 'start_availability', label: 'Quando pode começar', value: form.start_availability },
        { field_key: 'experience_years', label: 'Anos de experiência na área', value: form.experience_years },
        { field_key: 'experience_summary', label: 'Resumo da experiência', value: form.experience_summary },
        { field_key: 'why_petron', label: 'Por que quer trabalhar na Petron?', value: form.why_petron },
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
      setError(err.message || 'Erro ao enviar inscrição');
    } finally {
      setSubmitting(false);
    }
  };

  // ═════════════ Tela de sucesso ══════════════════════════════════

  if (submitted) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0A0A0A] flex items-center justify-center p-5 md:p-6">
        <BackgroundOrbs />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-lg w-full"
        >
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-7 md:p-10 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center mx-auto mb-5 md:mb-6 shadow-2xl shadow-[#F97316]/30"
            >
              <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl md:text-4xl font-bold mb-3 text-white tracking-tight"
              style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}
            >
              Inscrição recebida.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm md:text-base text-white/60 mb-6 md:mb-8 leading-relaxed"
            >
              Recebemos seu cadastro para a vaga de{' '}
              <span className="text-[#F97316] font-semibold">
                {selectedProfile?.title_public}
              </span>
              . Nossa equipe vai analisar e entrar em contato pelo WhatsApp em até 5 dias úteis.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSubmitted(false);
                setSelectedProfile(null);
                setStep('choose');
                setForm(INITIAL_STATE);
                setResumeFile(null);
              }}
              className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 hover:border-white/30 transition-colors text-sm font-medium"
            >
              Ver outras vagas
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen relative overflow-x-hidden bg-[#0A0A0A] text-white"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* ─── Background: orbs animadas + grid pattern ─── */}
      <BackgroundOrbs orb1X={orb1X} orb1Y={orb1Y} orb2X={orb2X} orb2Y={orb2Y} />
      <GridPattern />
      <NoiseOverlay />

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-[#F97316] origin-left z-50"
        style={{ scaleX }}
      />

      {/* ─── Header ─── */}
      <header className="relative z-30 border-b border-white/5 backdrop-blur-xl bg-black/40 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-[#F97316] blur-xl opacity-30" />
              <img src={petronLogo} alt="Petron" className="relative h-7 md:h-8 w-auto" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs md:text-sm text-white">Agência Petron</div>
              <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/40 truncate">
                Trabalhe conosco
              </div>
            </div>
          </motion.div>
          <StepIndicator currentStep={step} />
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="relative z-10 max-w-6xl mx-auto px-5 md:px-6 py-6 md:py-20">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="h-8 w-8 text-white/40" />
            </motion.div>
          </div>
        ) : profiles.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="wait">
            {step === 'choose' ? (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-12 md:space-y-20"
              >
                <HeroSection count={profiles.length} />
                <JobsSection profiles={profiles} onSelect={handleSelectProfile} />
                <ValuesSection />
              </motion.div>
            ) : (
              selectedProfile && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-8"
                >
                  <FormSection
                    profile={selectedProfile}
                    form={form}
                    patch={patch}
                    toolsForSelected={toolsForSelected}
                    resumeFile={resumeFile}
                    setResumeFile={setResumeFile}
                    honeypot={honeypot}
                    setHoneypot={setHoneypot}
                    submitting={submitting}
                    error={error}
                    onBack={handleBackToChoose}
                    onSubmit={handleSubmit}
                  />
                </motion.div>
              )
            )}
          </AnimatePresence>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/5 mt-16 md:mt-20 py-6 md:py-8">
        <div className="max-w-6xl mx-auto px-5 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          <div className="text-[11px] md:text-xs text-white/40">
            © {new Date().getFullYear()} Agência Petron · Içara - SC
          </div>
          <div className="text-[11px] md:text-xs text-white/40">
            Seus dados estão protegidos pela LGPD
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── BACKGROUND COMPONENTS ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function BackgroundOrbs({
  orb1X,
  orb1Y,
  orb2X,
  orb2Y,
}: {
  orb1X?: any;
  orb1Y?: any;
  orb2X?: any;
  orb2Y?: any;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Orb 1 — laranja */}
      <motion.div
        style={{ x: orb1X, y: orb1Y }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-15%] left-[-20%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full"
      >
        <div className="w-full h-full bg-[#F97316] blur-[90px] md:blur-[120px] opacity-40" />
      </motion.div>

      {/* Orb 2 — warm orange */}
      <motion.div
        style={{ x: orb2X, y: orb2Y }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-[-15%] right-[-20%] w-[450px] h-[450px] md:w-[700px] md:h-[700px] rounded-full"
      >
        <div className="w-full h-full bg-[#EA580C] blur-[100px] md:blur-[130px] opacity-30" />
      </motion.div>

      {/* Orb 3 — subtle center (desktop only) */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="hidden md:block absolute top-[40%] left-[40%] w-[500px] h-[500px] rounded-full"
      >
        <div className="w-full h-full bg-[#FB923C] blur-[100px] opacity-20" />
      </motion.div>
    </div>
  );
}

function GridPattern() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.04]">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

function NoiseOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── STEP INDICATOR ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { key: 'choose' as Step, label: 'Escolher' },
    { key: 'form' as Step, label: 'Inscrever' },
  ];

  return (
    <div className="hidden sm:flex items-center gap-3">
      {steps.map((s, i) => {
        const isActive = currentStep === s.key;
        const isDone = currentStep === 'form' && s.key === 'choose';
        return (
          <div key={s.key} className="flex items-center gap-3">
            <motion.div
              animate={{
                scale: isActive ? 1.05 : 1,
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-[#F97316]/12 text-[#F97316]'
                  : isDone
                  ? 'text-white/40'
                  : 'text-white/30'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-[#F97316] text-black'
                    : isDone
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
              </div>
              {s.label}
            </motion.div>
            {i < steps.length - 1 && (
              <div className="w-6 h-px bg-white/10" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── HERO SECTION ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function HeroSection({ count }: { count: number }) {
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (t: number) => {
      const elapsed = t - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayCount(Math.round(count * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="pt-2 md:pt-10 pb-2 md:pb-4"
    >
      {/* Badge */}
      <motion.div variants={fadeUp} className="flex items-center justify-center mb-6 md:mb-10">
        <div className="relative">
          <div className="absolute inset-0 bg-[#F97316] blur-lg opacity-50 animate-pulse" />
          <div className="relative inline-flex items-center gap-2 px-3 py-1.5 md:px-4 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 backdrop-blur">
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-[#F97316]"
            />
            <span className="text-[10px] md:text-[11px] font-semibold text-[#F97316] uppercase tracking-widest">
              {displayCount} {displayCount === 1 ? 'vaga aberta' : 'vagas abertas'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Title — editorial bold */}
      <motion.h1
        variants={fadeUp}
        className="text-center font-bold tracking-tight leading-[0.88] md:leading-[0.85] mb-5 md:mb-6 text-white px-2"
        style={{
          fontFamily: 'Space Grotesk, Inter, sans-serif',
          fontSize: 'clamp(2.75rem, 13vw, 8rem)',
          letterSpacing: '-0.035em',
        }}
      >
        Vem crescer
        <br />
        <span className="relative inline-block">
          <span
            className="italic font-normal"
            style={{
              fontFamily: 'Instrument Serif, serif',
              background: 'linear-gradient(135deg, #F97316 0%, #FB923C 50%, #EA580C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            com a gente.
          </span>
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-[3px] md:h-1 bg-gradient-to-r from-[#F97316] via-[#FB923C] to-[#EA580C] origin-left"
          />
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        variants={fadeUp}
        className="text-center text-sm md:text-xl text-white/60 leading-relaxed max-w-2xl mx-auto mb-6 md:mb-8 px-2"
      >
        A Petron é um time que vive de entregar resultado de verdade. Se você quer aprender rápido, ser dono do que faz e fazer parte de algo que tá crescendo todo mês — escolhe a vaga ali embaixo e bora trocar uma ideia.
      </motion.p>

      {/* Scroll hint */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col items-center gap-1.5 text-white/30"
      >
        <span className="text-[9px] md:text-[10px] uppercase tracking-widest">Conheça as vagas</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── JOBS SECTION ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function JobsSection({
  profiles,
  onSelect,
}: {
  profiles: PublicProfile[];
  onSelect: (p: PublicProfile) => void;
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={stagger}
    >
      <motion.div variants={fadeUp} className="flex items-end justify-between mb-6 md:mb-8">
        <div>
          <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-[#F97316] font-semibold mb-1.5 md:mb-2">
            Passo 1 de 2
          </div>
          <h2
            className="text-[2rem] md:text-5xl font-bold tracking-tight text-white leading-[0.95]"
            style={{
              fontFamily: 'Space Grotesk, Inter, sans-serif',
              letterSpacing: '-0.03em',
            }}
          >
            Escolha sua vaga.
          </h2>
        </div>
      </motion.div>

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        {profiles.map((p, i) => (
          <JobCard key={p.id} profile={p} index={i} onClick={() => onSelect(p)} />
        ))}
      </div>
    </motion.section>
  );
}

function JobCard({
  profile,
  index,
  onClick,
}: {
  profile: PublicProfile;
  index: number;
  onClick: () => void;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <motion.button
      variants={cardReveal}
      custom={index}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="group relative text-left p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 active:border-[#F97316]/60 bg-white/[0.02] backdrop-blur-xl cursor-pointer overflow-hidden transition-colors hover:border-[#F97316]/50"
    >
      {/* Glow effect on hover */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: useTransform(
            [mouseX, mouseY] as any,
            ([x, y]: any) =>
              `radial-gradient(400px circle at ${x}px ${y}px, rgba(249, 115, 22, 0.15), transparent 40%)`
          ),
        }}
      />

      {/* Border glow */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#F97316]/20 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-2.5 md:mb-3">
          <h3
            className="text-lg md:text-2xl font-bold leading-tight text-white group-hover:text-[#FB923C] transition-colors"
            style={{
              fontFamily: 'Space Grotesk, Inter, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            {profile.title_public}
          </h3>
          {profile.requires_experience && (
            <div className="flex-shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 md:py-1 rounded-full border border-white/20 text-white/60">
              Exp.
            </div>
          )}
        </div>

        {profile.short_pitch && (
          <p className="text-xs md:text-sm text-white/50 mb-4 md:mb-5 line-clamp-2 leading-relaxed">
            {profile.short_pitch}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-5">
          {profile.department && (
            <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 md:py-1 rounded-md bg-white/5 text-white/60">
              {profile.department}
            </span>
          )}
          <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 md:py-1 rounded-md bg-white/5 text-white/60">
            {SENIORITY_LABEL[profile.seniority]}
          </span>
          <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 md:py-1 rounded-md bg-white/5 text-white/60 inline-flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            {MODALITY_LABEL[profile.modality]}
          </span>
          <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 md:py-1 rounded-md bg-white/5 text-white/60">
            {CONTRACT_LABEL[profile.contract_type]}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-white/5">
          {profile.salary_range ? (
            <div className="text-[10px] md:text-xs text-white/40 font-mono truncate pr-2">{profile.salary_range}</div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs font-semibold text-[#F97316] group-hover:gap-3 transition-all flex-shrink-0">
            Me inscrever
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── VALUES SECTION ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function ValuesSection() {
  const values = [
    {
      icon: TrendingUp,
      title: 'Vontade de crescer',
      desc: 'A gente valoriza quem não se contenta com o básico. Se você quer evoluir de verdade e ir longe, esse é seu lugar.',
    },
    {
      icon: Zap,
      title: 'Proatividade',
      desc: 'Buscar sempre mais. Não esperar ordens, não entregar no mínimo — antecipar problemas e propor soluções.',
    },
    {
      icon: Flame,
      title: 'Sangue no olho',
      desc: 'Aqui a gente entra pra ganhar. Fome de resultado, disposição pra ralar e compromisso com cada entrega.',
    },
  ];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={stagger}
      className="pt-10"
    >
      <motion.div variants={fadeUp} className="text-center mb-8 md:mb-12">
        <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-[#F97316] font-semibold mb-1.5 md:mb-2">
          Por que Petron
        </div>
        <h2
          className="text-[1.75rem] md:text-5xl font-bold tracking-tight text-white leading-[0.95]"
          style={{
            fontFamily: 'Space Grotesk, Inter, sans-serif',
            letterSpacing: '-0.03em',
          }}
        >
          O que a gente valoriza.
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-3 md:gap-6">
        {values.map((v) => (
          <motion.div
            key={v.title}
            variants={cardReveal}
            className="relative p-5 md:p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-20 h-20 bg-[#F97316]/10 blur-3xl rounded-full group-hover:bg-[#F97316]/20 transition-colors" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F97316]/20 to-[#EA580C]/20 border border-[#F97316]/30 flex items-center justify-center mb-4">
                <v.icon className="h-5 w-5 text-[#F97316]" />
              </div>
              <h3
                className="text-lg font-bold text-white mb-2"
                style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}
              >
                {v.title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">{v.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
        <Briefcase className="h-7 w-7 text-white/40" />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-white">
        Nenhuma vaga aberta no momento
      </h2>
      <p className="text-white/50">
        Acompanhe nossas redes sociais pra ficar por dentro.
      </p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── FORM SECTION ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

interface FormSectionProps {
  profile: PublicProfile;
  form: FormState;
  patch: (p: Partial<FormState>) => void;
  toolsForSelected: string[];
  resumeFile: File | null;
  setResumeFile: (f: File | null) => void;
  honeypot: string;
  setHoneypot: (v: string) => void;
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function FormSection({
  profile,
  form,
  patch,
  toolsForSelected,
  resumeFile,
  setResumeFile,
  honeypot,
  setHoneypot,
  submitting,
  error,
  onBack,
  onSubmit,
}: FormSectionProps) {
  const req = resolveRequirements(profile);
  return (
    <>
      {/* Back + step */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs md:text-sm text-white/60 hover:text-white active:text-white transition-colors group py-2 -ml-1 pl-1 pr-2 rounded-lg active:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Trocar de vaga
        </button>
        <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/40">
          Passo 2 de 2
        </div>
      </motion.div>

      {/* Header da vaga selecionada */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-2xl md:rounded-3xl border border-[#F97316]/30 bg-gradient-to-br from-[#F97316]/10 via-[#F97316]/5 to-transparent backdrop-blur-xl p-5 md:p-8 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F97316]/20 blur-3xl rounded-full" />
        <div className="relative">
          <div className="text-[9px] md:text-[10px] font-bold text-[#F97316] uppercase tracking-widest mb-2">
            Você está se inscrevendo para
          </div>
          <h2
            className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight"
            style={{
              fontFamily: 'Space Grotesk, Inter, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            {profile.title_public}
          </h2>
          {profile.short_pitch && (
            <p className="text-sm md:text-base text-white/60 mb-4 max-w-2xl">{profile.short_pitch}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {profile.department && (
              <Chip>{profile.department}</Chip>
            )}
            <Chip>{SENIORITY_LABEL[profile.seniority]}</Chip>
            <Chip icon={<MapPin className="h-3 w-3" />}>
              {MODALITY_LABEL[profile.modality]}
              {profile.base_city && ` · ${profile.base_city}`}
            </Chip>
            <Chip>{CONTRACT_LABEL[profile.contract_type]}</Chip>
            {profile.salary_range && <Chip>{profile.salary_range}</Chip>}
            {profile.requires_experience && <Chip>Exige experiência</Chip>}
          </div>
        </div>
      </motion.div>

      {/* Detalhes colapsáveis */}
      {(profile.mission ||
        (profile.deliverables && profile.deliverables.length > 0) ||
        (profile.requirements && profile.requirements.length > 0)) && (
        <motion.details
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="group rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden"
        >
          <summary className="cursor-pointer px-5 md:px-6 py-4 text-xs md:text-sm font-medium text-white/60 hover:text-white active:bg-white/5 flex items-center gap-3 transition-colors">
            <ChevronDown className="h-4 w-4 -rotate-90 group-open:rotate-0 transition-transform flex-shrink-0" />
            <span>Ver detalhes da vaga (missão, entregáveis, requisitos)</span>
          </summary>
          <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-5">
            {profile.mission && (
              <div>
                <div className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest mb-2">
                  Missão
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  {profile.mission}
                </p>
              </div>
            )}
            {profile.deliverables && profile.deliverables.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest mb-2">
                  O que você vai entregar
                </div>
                <ul className="space-y-2">
                  {profile.deliverables.map((d, i) => (
                    <li key={i} className="flex gap-3 text-sm text-white/70">
                      <Clock className="h-4 w-4 text-[#F97316] flex-shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.requirements && profile.requirements.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest mb-2">
                  Requisitos
                </div>
                <ul className="space-y-2">
                  {profile.requirements.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.details>
      )}

      {/* Formulário */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl md:rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 md:p-10"
      >
        <div className="mb-6 md:mb-8">
          <div className="text-[9px] md:text-[10px] font-bold text-[#F97316] uppercase tracking-widest mb-1.5 md:mb-2">
            Quase lá
          </div>
          <h2
            className="text-2xl md:text-3xl font-bold text-white mb-1.5 md:mb-2"
            style={{
              fontFamily: 'Space Grotesk, Inter, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            Seus dados.
          </h2>
          <p className="text-xs md:text-sm text-white/50">
            Leva uns 3 minutos. Quanto mais completo, melhor a gente te entende.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-7 md:space-y-8">
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
          <FormGroup title="Dados pessoais">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Nome completo" required={req.full_name}>
                <DarkInput
                  value={form.full_name}
                  onChange={(e) => patch({ full_name: e.target.value })}
                  placeholder="João da Silva"
                />
              </FormField>
              <FormField label="E-mail" required={req.email}>
                <DarkInput
                  type="email"
                  value={form.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="joao@email.com"
                />
              </FormField>
              <FormField label="WhatsApp" required={req.phone}>
                <DarkInput
                  type="tel"
                  value={form.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  placeholder="(48) 99999-9999"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cidade" required={req.city}>
                  <DarkInput
                    value={form.city}
                    onChange={(e) => patch({ city: e.target.value })}
                    placeholder="Içara"
                  />
                </FormField>
                <FormField label="UF" required={req.state}>
                  <DarkInput
                    value={form.state}
                    onChange={(e) =>
                      patch({ state: e.target.value.toUpperCase().slice(0, 2) })
                    }
                    placeholder="SC"
                    maxLength={2}
                  />
                </FormField>
              </div>
              {(isDesignerRole(profile) || req.portfolio_url) && (
                <FormField
                  label="Portfólio / LinkedIn / Behance"
                  required={req.portfolio_url}
                  hint={
                    req.portfolio_url
                      ? undefined
                      : 'Opcional. Se preferir, anexe o portfólio no currículo.'
                  }
                  className="md:col-span-2"
                >
                  <DarkInput
                    value={form.portfolio_url}
                    onChange={(e) => patch({ portfolio_url: e.target.value })}
                    placeholder="https://behance.net/seunome"
                  />
                </FormField>
              )}
            </div>
          </FormGroup>

          {/* Disponibilidade */}
          <FormGroup title="Disponibilidade & expectativas">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Disponibilidade para trabalho presencial em Içara - SC"
                required={req.presential_availability}
              >
                <DarkSelect
                  value={form.presential_availability}
                  onValueChange={(v) => patch({ presential_availability: v })}
                  placeholder="Selecione..."
                  options={[
                    { value: 'Sim, moro em Içara ou região', label: 'Sim, moro em Içara ou região' },
                    { value: 'Sim, tenho disponibilidade para mudar', label: 'Sim, posso mudar' },
                    { value: 'Sim, moro em cidade vizinha (até 30km)', label: 'Sim, moro em cidade vizinha (até 30km)' },
                    { value: 'Não, só tenho disponibilidade remota', label: 'Não, só remoto' },
                  ]}
                />
              </FormField>
              <FormField label="Quando pode começar?" required={req.start_availability}>
                <DarkSelect
                  value={form.start_availability}
                  onValueChange={(v) => patch({ start_availability: v })}
                  placeholder="Selecione..."
                  options={[
                    { value: 'Imediatamente', label: 'Imediatamente' },
                    { value: 'Em até 15 dias', label: 'Em até 15 dias' },
                    { value: 'Em até 30 dias', label: 'Em até 30 dias' },
                    { value: 'Em até 60 dias', label: 'Em até 60 dias' },
                    { value: 'Mais de 60 dias', label: 'Mais de 60 dias' },
                  ]}
                />
              </FormField>
              <FormField label="Expectativa salarial" required={req.salary_expectation}>
                <DarkInput
                  value={form.salary_expectation}
                  onChange={(e) => patch({ salary_expectation: e.target.value })}
                />
              </FormField>
              <FormField label="Anos de experiência na área" required={req.experience_years}>
                <DarkSelect
                  value={form.experience_years}
                  onValueChange={(v) => patch({ experience_years: v })}
                  placeholder="Selecione..."
                  options={[
                    { value: 'Nenhuma (quero começar)', label: 'Nenhuma (quero começar)' },
                    { value: 'Menos de 1 ano', label: 'Menos de 1 ano' },
                    { value: '1 a 2 anos', label: '1 a 2 anos' },
                    { value: '2 a 4 anos', label: '2 a 4 anos' },
                    { value: 'Mais de 4 anos', label: 'Mais de 4 anos' },
                  ]}
                />
              </FormField>
            </div>
          </FormGroup>

          {/* Ferramentas */}
          {toolsForSelected.length > 0 && (
            <FormGroup
              title={`Ferramentas que você sabe usar${req.tools_known ? ' *' : ''}`}
              subtitle={
                req.tools_known
                  ? 'Marque pelo menos uma ferramenta — obrigatório para esta vaga.'
                  : 'Marque as que você já utilizou, mesmo que seja só pra estudos.'
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {toolsForSelected.map((tool) => {
                  const checked = form.tools_known.includes(tool);
                  return (
                    <motion.label
                      key={tool}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border cursor-pointer transition-all min-h-[48px] ${
                        checked
                          ? 'border-[#F97316]/50 bg-[#F97316]/10'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] active:bg-white/[0.06]'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          if (c) patch({ tools_known: [...form.tools_known, tool] });
                          else patch({ tools_known: form.tools_known.filter((t) => t !== tool) });
                        }}
                        className={`flex-shrink-0 ${checked ? 'border-[#F97316] data-[state=checked]:bg-[#F97316]' : 'border-white/30'}`}
                      />
                      <span className={`text-sm truncate ${checked ? 'text-white' : 'text-white/70'}`}>
                        {tool}
                      </span>
                    </motion.label>
                  );
                })}
              </div>
            </FormGroup>
          )}

          {/* Conte sua história */}
          <FormGroup title="Conte sua história">
            <div className="space-y-4">
              <FormField
                label="Resumo da sua experiência profissional"
                required={req.experience_summary}
              >
                <DarkTextarea
                  value={form.experience_summary}
                  onChange={(e) => patch({ experience_summary: e.target.value })}
                  rows={4}
                  placeholder="Conte onde você trabalhou, o que fazia e quais resultados você gerou. Se não tem experiência, conte sobre projetos, cursos e motivação."
                />
              </FormField>
              <FormField label="Por que quer trabalhar na Petron?" required={req.why_petron}>
                <DarkTextarea
                  value={form.why_petron}
                  onChange={(e) => patch({ why_petron: e.target.value })}
                  rows={3}
                  placeholder="O que te atrai nessa vaga e na Petron?"
                />
              </FormField>
            </div>
          </FormGroup>

          {/* Currículo */}
          <FormGroup title="Currículo">
            <label className="flex items-center gap-3 md:gap-4 border-2 border-dashed border-white/15 hover:border-[#F97316]/50 active:border-[#F97316]/60 rounded-2xl p-4 md:p-5 cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04] active:bg-white/[0.06] group">
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-white/5 group-hover:bg-[#F97316]/10 flex items-center justify-center transition-colors flex-shrink-0">
                <Upload className="h-5 w-5 text-white/60 group-hover:text-[#F97316] transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                {resumeFile ? (
                  <>
                    <div className="text-sm font-medium text-white truncate">{resumeFile.name}</div>
                    <div className="text-xs text-white/40">
                      {(resumeFile.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium text-white">
                      Clique para enviar{' '}
                      {req.resume && (
                        <span className="text-[#F97316]">(obrigatório)</span>
                      )}
                    </div>
                    <div className="text-[11px] md:text-xs text-white/40">PDF, DOC, PNG ou JPG (máx 10MB)</div>
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
          </FormGroup>

          {/* LGPD */}
          <label className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/10 rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-colors">
            <Checkbox
              id="lgpd"
              checked={form.accept_lgpd}
              onCheckedChange={(v) => patch({ accept_lgpd: !!v })}
              className="border-white/30 data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316] mt-0.5"
            />
            <span className="text-xs text-white/60 leading-relaxed">
              Autorizo a Agência Petron a tratar meus dados pessoais para fins de recrutamento e
              seleção, conforme a LGPD. Meus dados serão usados apenas no processo seletivo e
              podem ser mantidos por até 1 ano para processos futuros.
            </span>
          </label>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              disabled={submitting}
              className="px-6 py-3.5 sm:py-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 hover:border-white/30 active:bg-white/10 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={submitting}
              className="relative flex-1 px-6 py-3.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-semibold text-sm shadow-2xl shadow-[#F97316]/30 transition-all hover:shadow-[#F97316]/50 disabled:opacity-70 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar minha inscrição
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── FORM PRIMITIVES (estilizados pra fundo escuro) ──────────────
// ═══════════════════════════════════════════════════════════════════

function FormGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-bold text-[#F97316] uppercase tracking-widest">
          {title}
        </div>
        {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function FormField({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-white/70 mb-1.5 block">
        {label}
        {required && <span className="text-[#F97316] ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-white/40 mt-1">{hint}</p>}
    </div>
  );
}

function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      {...props}
      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#F97316]/40 focus-visible:border-[#F97316]/50 rounded-xl h-12 md:h-11 text-base md:text-sm"
    />
  );
}

function DarkTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Textarea
      {...props}
      className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#F97316]/40 focus-visible:border-[#F97316]/50 rounded-xl resize-none text-base md:text-sm"
    />
  );
}

function DarkSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-white/[0.03] border-white/10 text-white focus:ring-[#F97316]/40 focus:border-[#F97316]/50 rounded-xl h-12 md:h-11 data-[placeholder]:text-white/30 text-base md:text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[#0F0F0F] border-white/10 text-white">
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="focus:bg-white/5 focus:text-white"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Chip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-semibold uppercase tracking-wider px-2 md:px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-white/80">
      {icon}
      {children}
    </span>
  );
}
