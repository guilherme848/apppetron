import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

const CHUNK_ERROR_PATTERNS = [
  'Loading chunk',
  'ChunkLoadError',
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Failed to import',
  'Unable to preload',
];

const RELOAD_KEY = 'erp-chunk-reload-attempt';

function isChunkError(error: Error): boolean {
  const msg = `${error.name} ${error.message}`.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some(p => msg.includes(p.toLowerCase()));
}

function hardReload() {
  const attempts = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
  if (attempts >= 2) {
    // Já tentamos 2x — não fica em loop, mostra erro manual
    sessionStorage.setItem(RELOAD_KEY, '0');
    return false;
  }
  sessionStorage.setItem(RELOAD_KEY, String(attempts + 1));
  // Bypass cache
  const url = new URL(window.location.href);
  url.searchParams.set('_cb', Date.now().toString());
  window.location.replace(url.toString());
  return true;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const chunk = isChunkError(error);
    if (chunk && hardReload()) {
      // Reload iniciado; render vazio enquanto navega
      return { hasError: true, error, isChunkError: true };
    }
    return { hasError: true, error, isChunkError: chunk };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  componentDidMount() {
    // Reseta contador quando renderiza com sucesso
    if (!this.state.hasError) {
      sessionStorage.removeItem(RELOAD_KEY);
    }

    // Handler global pra erros não-React (rejected promises)
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const err = event.reason;
    if (err instanceof Error && isChunkError(err)) {
      event.preventDefault();
      hardReload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Se era chunk e o reload já foi disparado, mostra tela de carregamento
      if (this.state.isChunkError) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Atualizando para a versão mais recente…</p>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h2 className="text-xl font-semibold">Algo deu errado</h2>
          <p className="text-muted-foreground text-sm max-w-md text-center">
            Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null, isChunkError: false })}>
              Tentar novamente
            </Button>
            <Button onClick={() => hardReload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
