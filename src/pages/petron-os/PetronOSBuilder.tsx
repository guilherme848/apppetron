import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, FileText, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  usePetronOSFerramenta,
  useSaveGeracao,
  buildClientContext,
} from '@/hooks/usePetronOS';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

export default function PetronOSBuilder() {
  const { slug, id: geracaoId } = useParams<{ slug: string; id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: ferramenta, isLoading } = usePetronOSFerramenta(slug);
  const saveGeracao = useSaveGeracao();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showStartModal, setShowStartModal] = useState(!geracaoId);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientContext, setClientContext] = useState('');
  const [titulo, setTitulo] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [sending, setSending] = useState(false);
  const [documentSections, setDocumentSections] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  const [editableDoc, setEditableDoc] = useState('');

  // Load clients
  useEffect(() => {
    supabase
      .from('accounts')
      .select('id, name, niche, city, state')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => setClients(data || []));
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSelectClient = useCallback(async (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId === 'none') {
      setClientContext('');
      return;
    }
    const { data: intel } = await supabase
      .from('inteligencia_cliente')
      .select('*')
      .eq('cliente_id', clientId)
      .maybeSingle();
    const client = clients.find(c => c.id === clientId);
    setClientContext(buildClientContext(client, intel));
  }, [clients]);

  const startChat = async () => {
    if (!ferramenta) return;
    setShowStartModal(false);

    // Build system prompt with client context
    let sysPrompt = ferramenta.system_prompt;
    if (clientContext) {
      sysPrompt = sysPrompt.split('{{contexto_cliente}}').join(`CONTEXTO DO CLIENTE:\n${clientContext}`);
    } else {
      sysPrompt = sysPrompt.split('{{contexto_cliente}}').join('');
    }
    const client = clients.find(c => c.id === selectedClientId);
    sysPrompt = sysPrompt.split('{{nome_cliente}}').join(client?.name || '');
    sysPrompt = sysPrompt.split('{{nicho_cliente}}').join(client?.niche || '');

    // Send initial message
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('petron-os-generate', {
        body: {
          system_prompt: sysPrompt,
          messages: [{ role: 'user', content: `Quero criar: ${titulo || ferramenta.nome}. Comece fazendo a primeira pergunta.` }],
          model: ferramenta.modelo_ia,
          max_tokens: ferramenta.max_tokens,
        },
      });
      if (error) throw error;

      const content = data?.content || '';
      let parsed: any = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { mensagem_chat: content };
      }

      const aiMessage = parsed.mensagem_chat || content;
      setChatMessages([
        { role: 'user', content: `Quero criar: ${titulo || ferramenta.nome}` },
        { role: 'assistant', content: aiMessage },
      ]);

      if (parsed.atualizacao_documento?.secao) {
        setDocumentSections(prev => ({
          ...prev,
          [parsed.atualizacao_documento.secao]: parsed.atualizacao_documento.conteudo,
        }));
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !ferramenta || sending) return;

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userInput }];
    setChatMessages(newMessages);
    setUserInput('');
    setSending(true);

    try {
      let sysPrompt = ferramenta.system_prompt;
      if (clientContext) {
        sysPrompt = sysPrompt.split('{{contexto_cliente}}').join(`CONTEXTO DO CLIENTE:\n${clientContext}`);
      } else {
        sysPrompt = sysPrompt.split('{{contexto_cliente}}').join('');
      }

      const { data, error } = await supabase.functions.invoke('petron-os-generate', {
        body: {
          system_prompt: sysPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          model: ferramenta.modelo_ia,
          max_tokens: ferramenta.max_tokens,
        },
      });
      if (error) throw error;

      const content = data?.content || '';
      let parsed: any = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { mensagem_chat: content };
      }

      const aiMessage = parsed.mensagem_chat || content;
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);

      if (parsed.atualizacao_documento?.secao) {
        setDocumentSections(prev => ({
          ...prev,
          [parsed.atualizacao_documento.secao]: parsed.atualizacao_documento.conteudo,
        }));
      }

      if (parsed.concluido) {
        setIsCompleted(true);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleFinalize = () => {
    const sections = ferramenta?.estrutura_documento || [];
    const html = sections
      .map(s => {
        const content = documentSections[s.slug] || '<p style="color: var(--muted-foreground); opacity: 0.4;">Seção não preenchida</p>';
        return `<h2>${s.titulo}</h2>\n${content}`;
      })
      .join('\n\n');
    setEditableDoc(html);
    setEditorMode(true);
  };

  const handleSave = () => {
    saveGeracao.mutate({
      ferramenta_id: ferramenta!.id,
      cliente_id: selectedClientId === 'none' ? null : selectedClientId,
      historico_chat: chatMessages as any,
      conteudo_documento: editorMode ? editableDoc : undefined,
      status: isCompleted ? 'concluido' : 'em_construcao',
      titulo: titulo || ferramenta?.nome || 'Documento',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] rounded-2xl" />
      </div>
    );
  }

  if (!ferramenta) return <div className="text-center py-16 text-muted-foreground">Ferramenta não encontrada</div>;

  const sections = ferramenta.estrutura_documento || [];

  // Editor mode
  if (editorMode) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setEditorMode(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="text-xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="Título do documento"
              />
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/12 text-primary">Documento</span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-green-500/12 text-green-500">
                  {isCompleted ? 'Concluído' : 'Em construção'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditorMode(false)} className="gap-1">
              <Sparkles className="h-3 w-3" /> Reabrir Chat
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              Salvar
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8">
          <Textarea
            value={editableDoc}
            onChange={e => setEditableDoc(e.target.value)}
            className="min-h-[600px] border-none bg-transparent resize-none text-sm leading-relaxed focus-visible:ring-0"
            placeholder="Conteúdo do documento..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Start Modal */}
      <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              {ferramenta.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Cliente (opcional)</Label>
              <Select value={selectedClientId || ''} onValueChange={handleSelectClient}>
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Título do documento</Label>
              <Input
                placeholder={ferramenta.nome}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={startChat} className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
              <Sparkles className="h-4 w-4" /> Iniciar com IA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Breadcrumb + Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/petron-os" className="hover:text-foreground transition-colors">Petron OS</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{ferramenta.nome}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/petron-os')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{titulo || ferramenta.nome}</h1>
        </div>
        {isCompleted && (
          <Button onClick={handleFinalize} className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            <Edit3 className="h-4 w-4" /> Finalizar e Editar
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleSave} className="gap-1">
          Salvar
        </Button>
      </div>

      {/* Chat + Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
        {/* Chat */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div className={cn(
                  'max-w-[85%] rounded-xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-orange-500/12 text-foreground'
                    : 'bg-card border border-border text-foreground'
                )}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">Petron OS</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500 animate-spin" style={{ animationDuration: '3s' }} />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2">
            <Textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="Sua resposta..."
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!userInput.trim() || sending}
              className="h-11 w-11 bg-gradient-to-r from-orange-500 to-pink-500 text-white shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Document Preview */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-8 overflow-y-auto">
          <div className="max-w-[720px] mx-auto space-y-6">
            <h2 className="text-lg font-bold text-foreground border-b border-border pb-3">
              {titulo || ferramenta.nome}
            </h2>

            {sections.map((section, idx) => {
              const content = documentSections[section.slug];
              return (
                <div key={section.slug} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {section.titulo}
                  </h3>
                  {content ? (
                    <div
                      className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground/40 italic">
                      Aguardando preenchimento pelo chat...
                    </p>
                  )}
                </div>
              );
            })}

            {sections.length === 0 && Object.keys(documentSections).length === 0 && (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground">O documento será construído conforme o chat avançar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
