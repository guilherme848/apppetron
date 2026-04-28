import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// As tabelas hr_* foram criadas em migration separada e ainda não estão
// incluídas no Database type gerado. Usamos um cast local para evitar
// regenerar o types.ts em cada alteração do schema RH.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;
import {
  DEFAULT_FIELD_REQUIREMENTS,
  type HrJobProfile,
  type HrJob,
  type HrPipelineStage,
  type HrForm,
  type HrFormQuestion,
  type HrCandidate,
  type HrApplication,
  type HrApplicationWithRelations,
  type HrApplicationEvent,
  type HrAiAnalysis,
  type HrFormResponse,
} from '@/types/rh';
import type { DiscAssessment } from '@/types/disc';

// ─────────────────────────────────────────────────────────────
// Helpers de mapeamento (tratam nulls + arrays JSONB)
// ─────────────────────────────────────────────────────────────

const asArray = <T>(v: unknown, fallback: T[] = []): T[] =>
  Array.isArray(v) ? (v as T[]) : fallback;

const mapProfile = (d: any): HrJobProfile => ({
  id: d.id,
  title_internal: d.title_internal,
  title_public: d.title_public,
  department: d.department,
  seniority: d.seniority,
  contract_type: d.contract_type,
  modality: d.modality,
  base_city: d.base_city,
  manager_member_id: d.manager_member_id,
  synonyms: d.synonyms || [],
  mission: d.mission,
  short_pitch: d.short_pitch ?? null,
  deliverables: asArray<string>(d.deliverables),
  skills: asArray(d.skills),
  tools: asArray(d.tools),
  requirements: asArray<string>(d.requirements),
  process: asArray(d.process),
  plan_30: asArray(d.plan_30),
  notes: d.notes,
  default_stages: asArray(d.default_stages),
  status: d.status,
  accepting_applications: d.accepting_applications ?? false,
  requires_experience: d.requires_experience ?? false,
  salary_range: d.salary_range ?? null,
  field_requirements: { ...DEFAULT_FIELD_REQUIREMENTS, ...(d.field_requirements || {}) },
  created_by_member_id: d.created_by_member_id,
  created_at: d.created_at,
  updated_at: d.updated_at,
});

const mapJob = (d: any): HrJob => ({
  id: d.id,
  job_profile_id: d.job_profile_id,
  title: d.title,
  slug: d.slug,
  description: d.description,
  snapshot_profile: d.snapshot_profile ? mapProfile(d.snapshot_profile) : null,
  status: d.status,
  opened_at: d.opened_at,
  closed_at: d.closed_at,
  closed_reason: d.closed_reason,
  candidates_count: d.candidates_count ?? 0,
  hired_count: d.hired_count ?? 0,
  manager_member_id: d.manager_member_id,
  created_by_member_id: d.created_by_member_id,
  created_at: d.created_at,
  updated_at: d.updated_at,
});

const mapStage = (d: any): HrPipelineStage => ({
  id: d.id,
  job_id: d.job_id,
  name: d.name,
  order_index: d.order_index,
  color: d.color || '#94a3b8',
  is_terminal_success: d.is_terminal_success,
  is_terminal_rejection: d.is_terminal_rejection,
  description: d.description,
  created_at: d.created_at,
});

const mapForm = (d: any): HrForm => ({
  id: d.id,
  job_id: d.job_id,
  name: d.name,
  slug: d.slug,
  active: d.active,
  public: d.public,
  intro_text: d.intro_text,
  success_message: d.success_message,
  submit_button_text: d.submit_button_text,
  captcha_enabled: d.captcha_enabled,
  honeypot_enabled: d.honeypot_enabled,
  resume_required: d.resume_required,
  resume_formats: d.resume_formats || [],
  resume_max_mb: d.resume_max_mb,
  auto_ai_analysis: d.auto_ai_analysis,
  default_stage_order: d.default_stage_order,
  auto_tags: d.auto_tags || [],
  created_by_member_id: d.created_by_member_id,
  created_at: d.created_at,
  updated_at: d.updated_at,
});

const mapQuestion = (d: any): HrFormQuestion => ({
  id: d.id,
  form_id: d.form_id,
  order_index: d.order_index,
  field_key: d.field_key,
  label: d.label,
  help_text: d.help_text,
  placeholder: d.placeholder,
  field_type: d.field_type,
  required: d.required,
  options: asArray(d.options),
  validation: d.validation || {},
  default_value: d.default_value,
  created_at: d.created_at,
});

const mapCandidate = (d: any): HrCandidate => ({
  id: d.id,
  full_name: d.full_name,
  email: d.email,
  phone: d.phone,
  birth_date: d.birth_date,
  city: d.city,
  state: d.state,
  linkedin_url: d.linkedin_url,
  portfolio_url: d.portfolio_url,
  source: d.source,
  raw_metadata: d.raw_metadata || {},
  created_at: d.created_at,
  updated_at: d.updated_at,
});

const mapApplication = (d: any): HrApplication => ({
  id: d.id,
  candidate_id: d.candidate_id,
  job_id: d.job_id,
  form_id: d.form_id,
  current_stage_id: d.current_stage_id,
  status: d.status,
  rating: d.rating,
  resume_url: d.resume_url,
  resume_filename: d.resume_filename,
  internal_notes: d.internal_notes,
  applied_at: d.applied_at,
  decided_at: d.decided_at,
  decided_by_member_id: d.decided_by_member_id,
  ai_score: d.ai_score,
  ai_recommendation: d.ai_recommendation,
  ai_analyzed_at: d.ai_analyzed_at,
  created_at: d.created_at,
  updated_at: d.updated_at,
});

// ─────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────

export function useRhData() {
  const [profiles, setProfiles] = useState<HrJobProfile[]>([]);
  const [jobs, setJobs] = useState<HrJob[]>([]);
  const [candidates, setCandidates] = useState<HrCandidate[]>([]);
  const [applications, setApplications] = useState<HrApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── FETCHERS ─────────────────────────────────────────────

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await sb
      .from('hr_job_profiles')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('[RH] fetchProfiles', error);
      return;
    }
    setProfiles((data || []).map(mapProfile));
  }, []);

  const fetchJobs = useCallback(async () => {
    const { data, error } = await sb
      .from('hr_jobs')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('[RH] fetchJobs', error);
      return;
    }
    setJobs((data || []).map(mapJob));
  }, []);

  const fetchCandidates = useCallback(async () => {
    const { data, error } = await sb
      .from('hr_candidates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('[RH] fetchCandidates', error);
      return;
    }
    setCandidates((data || []).map(mapCandidate));
  }, []);

  const fetchApplications = useCallback(async () => {
    const { data, error } = await sb
      .from('hr_applications')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(1000);
    if (error) {
      console.error('[RH] fetchApplications', error);
      return;
    }
    setApplications((data || []).map(mapApplication));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchProfiles(),
        fetchJobs(),
        fetchCandidates(),
        fetchApplications(),
      ]);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar dados RH');
    } finally {
      setLoading(false);
    }
  }, [fetchProfiles, fetchJobs, fetchCandidates, fetchApplications]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── PROFILE CRUD ─────────────────────────────────────────

  const createProfile = useCallback(
    async (input: Partial<HrJobProfile>) => {
      const { data, error } = await sb
        .from('hr_job_profiles')
        .insert({
          title_internal: input.title_internal || 'Nova Função',
          title_public: input.title_public || input.title_internal || 'Nova Função',
          department: input.department || null,
          seniority: input.seniority || 'pleno',
          contract_type: input.contract_type || 'clt',
          modality: input.modality || 'presencial',
          base_city: input.base_city || null,
          manager_member_id: input.manager_member_id || null,
          synonyms: input.synonyms || [],
          mission: input.mission || null,
          deliverables: input.deliverables || [],
          skills: input.skills || [],
          tools: input.tools || [],
          requirements: input.requirements || [],
          process: input.process || [],
          plan_30: input.plan_30 || [],
          notes: input.notes || null,
          status: input.status || 'active',
        })
        .select()
        .single();
      if (error) throw error;
      await fetchProfiles();
      return mapProfile(data);
    },
    [fetchProfiles]
  );

  const updateProfile = useCallback(
    async (id: string, patch: Partial<HrJobProfile>) => {
      const { error } = await sb
        .from('hr_job_profiles')
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;
      await fetchProfiles();
    },
    [fetchProfiles]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      const { error } = await sb
        .from('hr_job_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchProfiles();
    },
    [fetchProfiles]
  );

  // ─── JOB CRUD ─────────────────────────────────────────────

  const createJobFromProfile = useCallback(
    async (profileId: string, overrides?: { title?: string; slug?: string; description?: string }) => {
      const { data, error } = await sb.rpc('hr_create_job_from_profile', {
        p_profile_id: profileId,
        p_title: overrides?.title || null,
        p_slug: overrides?.slug || null,
        p_description: overrides?.description || null,
      });
      if (error) throw error;
      await Promise.all([fetchJobs(), fetchProfiles()]);
      return data as string; // retorna o job_id
    },
    [fetchJobs, fetchProfiles]
  );

  const updateJob = useCallback(
    async (id: string, patch: Partial<HrJob>) => {
      const { error } = await sb
        .from('hr_jobs')
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;
      await fetchJobs();
    },
    [fetchJobs]
  );

  const deleteJob = useCallback(
    async (id: string) => {
      const { error } = await sb.from('hr_jobs').delete().eq('id', id);
      if (error) throw error;
      await fetchJobs();
    },
    [fetchJobs]
  );

  const getJobById = useCallback(
    async (id: string): Promise<{ job: HrJob; stages: HrPipelineStage[] } | null> => {
      const { data: jobData, error: jobErr } = await sb
        .from('hr_jobs')
        .select('*')
        .eq('id', id)
        .single();
      if (jobErr) {
        console.error(jobErr);
        return null;
      }
      const { data: stagesData, error: stagesErr } = await sb
        .from('hr_pipeline_stages')
        .select('*')
        .eq('job_id', id)
        .order('order_index');
      if (stagesErr) console.error(stagesErr);
      return {
        job: mapJob(jobData),
        stages: (stagesData || []).map(mapStage),
      };
    },
    []
  );

  const getApplicationsByJob = useCallback(
    async (jobId: string): Promise<HrApplicationWithRelations[]> => {
      const { data, error } = await sb
        .from('hr_applications')
        .select('*, candidate:hr_candidates(*), stage:hr_pipeline_stages(*)')
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });
      if (error) {
        console.error(error);
        return [];
      }
      return (data || []).map((a: any) => ({
        ...mapApplication(a),
        candidate: mapCandidate(a.candidate),
        stage: a.stage ? mapStage(a.stage) : null,
      }));
    },
    []
  );

  // ─── APPLICATION ACTIONS ──────────────────────────────────

  const moveApplicationToStage = useCallback(
    async (applicationId: string, stageId: string) => {
      const { error } = await sb
        .from('hr_applications')
        .update({ current_stage_id: stageId })
        .eq('id', applicationId);
      if (error) throw error;
      await fetchApplications();
    },
    [fetchApplications]
  );

  const setApplicationStatus = useCallback(
    async (
      applicationId: string,
      status: HrApplication['status'],
      notes?: string
    ) => {
      const patch: any = {
        status,
        decided_at: status !== 'active' ? new Date().toISOString() : null,
      };
      if (notes) patch.internal_notes = notes;
      const { error } = await sb
        .from('hr_applications')
        .update(patch)
        .eq('id', applicationId);
      if (error) throw error;
      await fetchApplications();
    },
    [fetchApplications]
  );

  const updateApplicationRating = useCallback(
    async (applicationId: string, rating: number) => {
      const { error } = await sb
        .from('hr_applications')
        .update({ rating })
        .eq('id', applicationId);
      if (error) throw error;
      await fetchApplications();
    },
    [fetchApplications]
  );

  const addApplicationNote = useCallback(
    async (applicationId: string, note: string) => {
      const { error } = await sb.from('hr_application_events').insert({
        application_id: applicationId,
        event_type: 'note_added',
        description: note,
      });
      if (error) throw error;
    },
    []
  );

  const deleteApplication = useCallback(
    async (applicationId: string) => {
      // Cascade remove via FK: form_responses, events, ai_analyses
      const { error } = await sb.from('hr_applications').delete().eq('id', applicationId);
      if (error) throw error;
      await Promise.all([fetchApplications(), fetchCandidates(), fetchJobs()]);
    },
    [fetchApplications, fetchCandidates, fetchJobs]
  );

  const deleteCandidate = useCallback(
    async (candidateId: string) => {
      // Remove candidato (cascade remove TODAS as applications + respostas + eventos)
      const { error } = await sb.from('hr_candidates').delete().eq('id', candidateId);
      if (error) throw error;
      await Promise.all([fetchApplications(), fetchCandidates(), fetchJobs()]);
    },
    [fetchApplications, fetchCandidates, fetchJobs]
  );

  const getApplicationDetails = useCallback(
    async (
      applicationId: string
    ): Promise<{
      application: HrApplication;
      candidate: HrCandidate;
      job: HrJob;
      stages: HrPipelineStage[];
      responses: HrFormResponse[];
      events: HrApplicationEvent[];
      analyses: HrAiAnalysis[];
    } | null> => {
      const { data: app, error } = await sb
        .from('hr_applications')
        .select('*, candidate:hr_candidates(*), job:hr_jobs(*)')
        .eq('id', applicationId)
        .single();
      if (error || !app) {
        console.error(error);
        return null;
      }
      const [stagesRes, responsesRes, eventsRes, analysesRes] = await Promise.all([
        sb.from('hr_pipeline_stages').select('*').eq('job_id', app.job_id).order('order_index'),
        sb.from('hr_form_responses').select('*').eq('application_id', applicationId).order('created_at'),
        sb
          .from('hr_application_events')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false }),
        sb
          .from('hr_ai_analyses')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false }),
      ]);
      return {
        application: mapApplication(app),
        candidate: mapCandidate((app as any).candidate),
        job: mapJob((app as any).job),
        stages: ((stagesRes.data as any[]) || []).map(mapStage),
        responses: ((responsesRes.data as any[]) || []) as HrFormResponse[],
        events: ((eventsRes.data as any[]) || []) as HrApplicationEvent[],
        analyses: ((analysesRes.data as any[]) || []) as HrAiAnalysis[],
      };
    },
    []
  );

  // ─── DISC ────────────────────────────────────────────────

  const createDiscInvite = useCallback(
    async (
      applicationId: string
    ): Promise<{ id: string; access_token: string; status: string; reused: boolean }> => {
      const { data, error } = await sb.rpc('hr_disc_create_invite', {
        p_application_id: applicationId,
      });
      if (error) throw error;
      return data;
    },
    []
  );

  const getDiscByApplication = useCallback(
    async (applicationId: string): Promise<DiscAssessment | null> => {
      const { data, error } = await sb
        .from('hr_disc_assessments')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as DiscAssessment | null) || null;
    },
    []
  );

  // ─── RESUME UPLOAD ───────────────────────────────────────

  const uploadResume = useCallback(
    async (applicationId: string, file: File): Promise<string> => {
      const path = `${applicationId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await sb.storage
        .from('hr-resumes')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: signed } = await sb.storage
        .from('hr-resumes')
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      const url = signed?.signedUrl || path;
      await sb
        .from('hr_applications')
        .update({ resume_url: url, resume_filename: file.name })
        .eq('id', applicationId);
      await sb.from('hr_application_events').insert({
        application_id: applicationId,
        event_type: 'resume_uploaded',
        description: `Currículo anexado: ${file.name}`,
      });
      await fetchApplications();
      return url;
    },
    [fetchApplications]
  );

  // ─── FORM BUILDER CRUD ───────────────────────────────────

  const getFormsByJob = useCallback(async (jobId: string) => {
    const { data, error } = await sb
      .from('hr_forms')
      .select('*')
      .eq('job_id', jobId);
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map(mapForm);
  }, []);

  const getAllForms = useCallback(async () => {
    const { data, error } = await sb
      .from('hr_forms')
      .select('*, job:hr_jobs(id, title, status)')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  }, []);

  const getFormById = useCallback(
    async (id: string): Promise<{ form: HrForm; questions: HrFormQuestion[] } | null> => {
      const { data: f, error } = await sb
        .from('hr_forms')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !f) return null;
      const { data: qs } = await sb
        .from('hr_form_questions')
        .select('*')
        .eq('form_id', id)
        .order('order_index');
      return {
        form: mapForm(f),
        questions: ((qs as any[]) || []).map(mapQuestion),
      };
    },
    []
  );

  const createForm = useCallback(async (jobId: string, name: string, slug: string) => {
    const { data, error } = await sb
      .from('hr_forms')
      .insert({ job_id: jobId, name, slug })
      .select()
      .single();
    if (error) throw error;
    return mapForm(data);
  }, []);

  const updateForm = useCallback(async (id: string, patch: Partial<HrForm>) => {
    const { error } = await sb
      .from('hr_forms')
      .update(patch as any)
      .eq('id', id);
    if (error) throw error;
  }, []);

  const deleteForm = useCallback(async (id: string) => {
    const { error } = await sb.from('hr_forms').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const upsertQuestions = useCallback(
    async (formId: string, questions: Partial<HrFormQuestion>[]) => {
      // Estratégia simples: apagar todas e reinserir
      await sb.from('hr_form_questions').delete().eq('form_id', formId);
      if (!questions.length) return;
      const rows = questions.map((q, idx) => ({
        form_id: formId,
        order_index: q.order_index ?? idx,
        field_key: q.field_key || `field_${idx + 1}`,
        label: q.label || 'Pergunta sem título',
        help_text: q.help_text || null,
        placeholder: q.placeholder || null,
        field_type: q.field_type || 'text',
        required: q.required ?? false,
        options: q.options || [],
        validation: q.validation || {},
        default_value: q.default_value || null,
      }));
      const { error } = await sb.from('hr_form_questions').insert(rows);
      if (error) throw error;
    },
    []
  );

  // ─── AI: chamar edge function rh-analyze-candidate ────────

  const runAiAnalysis = useCallback(async (applicationId: string) => {
    const { data, error } = await sb.functions.invoke('rh-analyze-candidate', {
      body: { application_id: applicationId },
    });
    if (error) throw error;
    await fetchApplications();
    return data;
  }, [fetchApplications]);

  return {
    // state
    profiles,
    jobs,
    candidates,
    applications,
    loading,
    error,
    // refetch
    refetch: fetchAll,
    fetchProfiles,
    fetchJobs,
    fetchCandidates,
    fetchApplications,
    // profiles
    createProfile,
    updateProfile,
    deleteProfile,
    // jobs
    createJobFromProfile,
    updateJob,
    deleteJob,
    getJobById,
    getApplicationsByJob,
    // applications
    moveApplicationToStage,
    setApplicationStatus,
    updateApplicationRating,
    addApplicationNote,
    deleteApplication,
    deleteCandidate,
    getApplicationDetails,
    uploadResume,
    // disc
    createDiscInvite,
    getDiscByApplication,
    // forms
    getFormsByJob,
    getAllForms,
    getFormById,
    createForm,
    updateForm,
    deleteForm,
    upsertQuestions,
    // ai
    runAiAnalysis,
  };
}
