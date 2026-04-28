import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { HrTechnicalPublicCtx } from '@/types/hrEvaluations';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

export default function TechnicalTestPage() {
  const { token } = useParams<{ token: string }>();
  const [ctx, setCtx] = useState<HrTechnicalPublicCtx | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await sb.rpc('hr_tech_get_by_token', { p_token: token });
      if (error) toast.error('Erro ao carregar teste');
      else {
        setCtx(data as HrTechnicalPublicCtx);
        if ((data as HrTechnicalPublicCtx).submission_url) setUrl((data as HrTechnicalPublicCtx).submission_url || '');
        if ((data as HrTechnicalPublicCtx).submission_text) setText((data as HrTechnicalPublicCtx).submission_text || '');
      }
      setLoading(false);
    })();
  }, [token]);

  const submit = async () => {
    if (!token) return;
    if (!url.trim() && !text.trim()) {
      toast.error('Você precisa enviar pelo menos um link OU um texto.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await sb.rpc('hr_tech_submit', {
        p_token: token,
        p_url: url.trim() || null,
        p_text: text.trim() || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao enviar');
      // Recarrega ctx
      const refresh = await sb.rpc('hr_tech_get_by_token', { p_token: token });
      setCtx(refresh.data);
      toast.success('Entrega enviada!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </Shell>
    );
  }

  if (!ctx?.success) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-lg font-semibold mb-1">Link inválido</div>
            <p className="text-sm text-muted-foreground">
              Esse link não é válido. Fala com a equipe Petron.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const test = ctx.test;
  const isSubmitted = ctx.status === 'submitted' || ctx.status === 'evaluated';
  const isExpired = ctx.status === 'expired';
  const firstName = (ctx.candidate_name || '').split(' ')[0];

  if (isSubmitted) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="text-xl font-semibold">Entrega recebida, {firstName}!</div>
            <p className="text-sm text-muted-foreground">
              A equipe Petron já está avaliando. Em breve você terá retorno.
            </p>
            {ctx.submitted_at && (
              <p className="text-[11px] text-muted-foreground">
                Enviado em {new Date(ctx.submitted_at).toLocaleString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (isExpired) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-lg font-semibold mb-1">Prazo expirado</div>
            <p className="text-sm text-muted-foreground">
              Esse teste técnico expirou. Fala com a equipe Petron pra alinhar.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!test) {
    return (
      <Shell>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Briefing indisponível.</p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Teste técnico — vaga {ctx.job_title}
              </div>
              <div className="text-xl font-semibold">Olá, {firstName}!</div>
              <div className="text-sm text-muted-foreground mt-0.5">{test.title}</div>
            </div>
          </div>

          {ctx.deadline_at && (
            <div className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <Clock className="h-4 w-4 text-amber-600" />
              Prazo: <strong>{new Date(ctx.deadline_at).toLocaleString('pt-BR')}</strong>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Briefing
            </div>
            <div className="bg-muted/40 border rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {test.briefing || 'Nenhum briefing fornecido. Fale com a equipe.'}
            </div>
          </div>

          {test.rubric && test.rubric.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Como vamos avaliar
              </div>
              <ul className="space-y-1">
                {test.rubric.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      peso {r.weight}
                    </Badge>
                    <div>
                      <strong>{r.criterion}</strong>
                      {r.description && <span className="text-muted-foreground"> — {r.description}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3 pt-3 border-t">
            <div>
              <Label>Link da entrega (Drive, GitHub, vídeo, etc)</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div>
              <Label>Comentário / explicação (opcional ou em vez do link)</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="Conta como abordou o problema, decisões que tomou, premissas, etc."
              />
            </div>
            <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
                </>
              ) : (
                'Enviar entrega'
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Você pode enviar só link, só comentário, ou os dois. Após enviar, não dá pra editar.
            </p>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8 sm:py-14 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            <span className="text-primary">⬢</span> Petron · Teste Técnico
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
