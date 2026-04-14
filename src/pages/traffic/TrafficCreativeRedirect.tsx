import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const CREATIVE_URL = 'https://petron-creative-studio.vercel.app';

async function buildCreativeUrl(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return CREATIVE_URL;
  const params = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: 'bearer',
    expires_in: String(session.expires_in ?? 3600),
    type: 'magiclink',
  });
  return `${CREATIVE_URL}/#${params.toString()}`;
}

export default function TrafficCreativeRedirect() {
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await buildCreativeUrl();
      if (cancelled) return;
      setTimeout(() => { window.location.href = url; }, 600);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleManual = async () => {
    setRedirecting(true);
    const url = await buildCreativeUrl();
    window.location.href = url;
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              {redirecting ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <Sparkles className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold">Abrindo Creative Studio…</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Você está sendo levado pro <strong>Petron Creative Studio</strong> com o mesmo login do ERP.
            </p>
          </div>
          <Button onClick={handleManual} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir manualmente
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Se o login não for reconhecido, faça login no Creative Studio. As credenciais são as mesmas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
