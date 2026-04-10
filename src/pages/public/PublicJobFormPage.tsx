import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
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

// Cliente público (anon) — não exposto ao authenticated client do ERP
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface FormData {
  form: any;
  questions: any[];
  job: any;
}

const PROTECTED_KEYS = [
  'full_name',
  'email',
  'phone',
  'birth_date',
  'city',
  'state',
  'linkedin_url',
  'portfolio_url',
];

export default function PublicJobFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      // Buscar form
      const { data: formRow, error: formErr } = await publicClient
        .from('hr_forms')
        .select('*, job:hr_jobs(id, title, description)')
        .eq('slug', slug)
        .eq('active', true)
        .eq('public', true)
        .maybeSingle();

      if (formErr || !formRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: questions } = await publicClient
        .from('hr_form_questions')
        .select('*')
        .eq('form_id', formRow.id)
        .order('order_index');

      setData({
        form: formRow,
        questions: questions || [],
        job: (formRow as any).job,
      });
      setLoading(false);
    })();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setSubmitting(true);
    setError(null);

    try {
      // Validar obrigatórios
      for (const q of data.questions) {
        if (q.required && (values[q.field_key] === undefined || values[q.field_key] === '')) {
          setError(`Preencha: ${q.label}`);
          setSubmitting(false);
          return;
        }
      }

      if (data.form.resume_required && !resumeFile) {
        setError('Anexe o currículo');
        setSubmitting(false);
        return;
      }

      // Upload currículo se houver
      let resumeUrl: string | null = null;
      let resumeFilename: string | null = null;
      if (resumeFile) {
        const path = `public-uploads/${data.form.id}/${Date.now()}_${resumeFile.name.replace(
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

      // Separar dados do candidato das respostas
      const candidatePayload: Record<string, any> = {};
      const responses: any[] = [];
      for (const q of data.questions) {
        const val = values[q.field_key];
        if (PROTECTED_KEYS.includes(q.field_key)) {
          candidatePayload[q.field_key] = val;
        }
        responses.push({
          field_key: q.field_key,
          label: q.label,
          value: val ?? null,
        });
      }

      // Garantir nome e email — se não vieram do form, pegar via fallback
      if (!candidatePayload.full_name) candidatePayload.full_name = values.full_name || '';
      if (!candidatePayload.email) candidatePayload.email = values.email || '';

      const { data: result, error: rpcErr } = await publicClient.rpc('hr_submit_application', {
        p_form_slug: slug,
        p_candidate: candidatePayload,
        p_responses: responses,
        p_resume_url: resumeUrl,
        p_resume_filename: resumeFilename,
        p_honeypot: honeypot || null,
      });

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">Vaga não encontrada</h1>
            <p className="text-sm text-muted-foreground">
              Esta vaga pode ter sido encerrada ou o link está incorreto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h1 className="text-xl font-semibold mb-2">Inscrição enviada!</h1>
            <p className="text-sm text-muted-foreground">
              {data?.form.success_message ||
                'Obrigado pela sua inscrição! Entraremos em contato em breve.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                Vaga aberta
              </div>
              <h1 className="text-3xl font-bold mb-2">{data.job?.title || 'Vaga'}</h1>
              {data.form.intro_text && (
                <p className="text-muted-foreground">{data.form.intro_text}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot (invisível) */}
              <input
                type="text"
                name="website_url"
                tabIndex={-1}
                autoComplete="off"
                style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />

              {data.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={values[q.field_key]}
                  onChange={(v) => setValues({ ...values, [q.field_key]: v })}
                />
              ))}

              {(data.form.resume_required ||
                !data.questions.some((q) => q.field_type === 'file')) && (
                <div>
                  <Label>
                    Currículo{' '}
                    {data.form.resume_required && <span className="text-destructive">*</span>}
                  </Label>
                  <div className="mt-1">
                    <label className="flex items-center gap-2 border border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {resumeFile ? resumeFile.name : 'Clique para enviar (PDF, DOC, PNG, JPG)'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept={data.form.resume_formats.map((f: string) => `.${f}`).join(',')}
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting} size="lg">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  data.form.submit_button_text || 'Enviar inscrição'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: any;
  value: any;
  onChange: (v: any) => void;
}) {
  const required = question.required;
  const label = (
    <Label>
      {question.label} {required && <span className="text-destructive">*</span>}
    </Label>
  );

  switch (question.field_type) {
    case 'textarea':
      return (
        <div>
          {label}
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder || ''}
            rows={4}
          />
          {question.help_text && (
            <p className="text-xs text-muted-foreground mt-1">{question.help_text}</p>
          )}
        </div>
      );
    case 'select':
      return (
        <div>
          {label}
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {(question.options || []).map((o: any) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'multiselect':
      return (
        <div>
          {label}
          <div className="space-y-2 mt-2">
            {(question.options || []).map((o: any) => {
              const arr = Array.isArray(value) ? value : [];
              const checked = arr.includes(o.value);
              return (
                <div key={o.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      if (c) onChange([...arr, o.value]);
                      else onChange(arr.filter((v: any) => v !== o.value));
                    }}
                  />
                  <span className="text-sm">{o.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex items-start gap-2">
          <Checkbox checked={!!value} onCheckedChange={onChange} />
          <div>
            <Label className="cursor-pointer">
              {question.label} {required && <span className="text-destructive">*</span>}
            </Label>
            {question.help_text && (
              <p className="text-xs text-muted-foreground">{question.help_text}</p>
            )}
          </div>
        </div>
      );
    case 'scale':
      return (
        <div>
          {label}
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  value === n
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    default: {
      const inputType =
        question.field_type === 'email'
          ? 'email'
          : question.field_type === 'phone'
          ? 'tel'
          : question.field_type === 'date'
          ? 'date'
          : question.field_type === 'number'
          ? 'number'
          : question.field_type === 'url'
          ? 'url'
          : 'text';
      return (
        <div>
          {label}
          <Input
            type={inputType}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder || ''}
          />
          {question.help_text && (
            <p className="text-xs text-muted-foreground mt-1">{question.help_text}</p>
          )}
        </div>
      );
    }
  }
}
