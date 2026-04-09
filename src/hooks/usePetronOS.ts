import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PetronOSCategoria {
  id: string;
  nome: string;
  slug: string;
  icone: string | null;
  cor: string | null;
  ordem: number;
  ativo: boolean;
}

export interface PetronOSCampoFormulario {
  nome: string;
  label: string;
  tipo: 'text' | 'textarea' | 'select' | 'number' | 'chips';
  placeholder?: string;
  obrigatorio?: boolean;
  sugestao_ia?: boolean;
  opcoes?: string[];
  min?: number;
  max?: number;
  padrao?: number | string;
}

export interface PetronOSPerguntaGuiada {
  pergunta: string;
  secao: string;
}

export interface PetronOSSecaoDocumento {
  slug: string;
  titulo: string;
}

export interface PetronOSFerramenta {
  id: string;
  categoria_id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  icone: string | null;
  cor: string | null;
  tipo: 'rapida' | 'construtor';
  campos_formulario: PetronOSCampoFormulario[] | null;
  perguntas_guiadas: PetronOSPerguntaGuiada[] | null;
  estrutura_documento: PetronOSSecaoDocumento[] | null;
  system_prompt: string;
  modelo_ia: string;
  max_tokens: number;
  ativo: boolean;
  ordem: number;
}

export interface PetronOSGeracao {
  id: string;
  ferramenta_id: string | null;
  cliente_id: string | null;
  usuario_id: string | null;
  inputs: Record<string, unknown> | null;
  resultado: string | null;
  historico_chat: unknown[] | null;
  conteudo_documento: string | null;
  status: string;
  titulo: string | null;
  created_at: string;
  updated_at: string;
}

export function usePetronOSCategorias() {
  return useQuery({
    queryKey: ['petron-os-categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('petron_os_categorias')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      if (error) throw error;
      return data as PetronOSCategoria[];
    },
  });
}

export function usePetronOSFerramentas() {
  return useQuery({
    queryKey: ['petron-os-ferramentas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('petron_os_ferramentas')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      if (error) throw error;
      return (data as unknown as PetronOSFerramenta[]).map(f => ({
        ...f,
        campos_formulario: f.campos_formulario as PetronOSCampoFormulario[] | null,
        perguntas_guiadas: f.perguntas_guiadas as PetronOSPerguntaGuiada[] | null,
        estrutura_documento: f.estrutura_documento as PetronOSSecaoDocumento[] | null,
      }));
    },
  });
}

export function usePetronOSFerramenta(slug: string | undefined) {
  return useQuery({
    queryKey: ['petron-os-ferramenta', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('petron_os_ferramentas')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      const f = data as unknown as PetronOSFerramenta;
      return {
        ...f,
        campos_formulario: f.campos_formulario as PetronOSCampoFormulario[] | null,
        perguntas_guiadas: f.perguntas_guiadas as PetronOSPerguntaGuiada[] | null,
        estrutura_documento: f.estrutura_documento as PetronOSSecaoDocumento[] | null,
      };
    },
    enabled: !!slug,
  });
}

export function usePetronOSGeracoes(limit = 5) {
  return useQuery({
    queryKey: ['petron-os-geracoes', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('petron_os_geracoes')
        .select('*, petron_os_ferramentas(nome, icone, cor, tipo)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveGeracao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (geracao: {
      ferramenta_id: string;
      cliente_id?: string | null;
      usuario_id?: string | null;
      inputs?: Record<string, unknown>;
      resultado?: string;
      historico_chat?: unknown[];
      conteudo_documento?: string;
      status?: string;
      titulo?: string;
    }) => {
      const { data, error } = await supabase
        .from('petron_os_geracoes')
        .insert(geracao as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petron-os-geracoes'] });
      toast({ title: 'Geração salva!' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    },
  });
}

export function buildClientContext(client: any, intelligence?: any): string {
  const parts: string[] = [];

  if (client?.name) parts.push(`Nome: ${client.name}`);
  if (client?.niche) parts.push(`Segmento/Nicho: ${client.niche}`);
  if (client?.city && client?.state) parts.push(`Localização: ${client.city}/${client.state}`);

  if (intelligence) {
    if (intelligence.icp_descricao) parts.push(`ICP: ${intelligence.icp_descricao}`);
    if (intelligence.icp_perfil_comprador) parts.push(`Perfil do Comprador: ${intelligence.icp_perfil_comprador}`);
    if (intelligence.icp_comportamento) parts.push(`Comportamento: ${intelligence.icp_comportamento}`);
    if (intelligence.icp_ticket_medio) parts.push(`Ticket Médio: ${intelligence.icp_ticket_medio}`);
    if (intelligence.produtos_especialidades?.length) parts.push(`Especialidades: ${intelligence.produtos_especialidades.join(', ')}`);
    if (intelligence.produtos_marcas) parts.push(`Marcas: ${intelligence.produtos_marcas}`);
    if (intelligence.produtos_carro_chefe) parts.push(`Carro-chefe: ${intelligence.produtos_carro_chefe}`);
    if (intelligence.diferencial) parts.push(`Diferencial: ${intelligence.diferencial}`);
    if (intelligence.tom_de_voz) parts.push(`Tom de Voz: ${intelligence.tom_de_voz}`);
    if (intelligence.posicionamento) parts.push(`Posicionamento: ${intelligence.posicionamento}`);
    if (intelligence.o_que_funciona) parts.push(`O que funciona: ${intelligence.o_que_funciona}`);
    if (intelligence.o_que_nao_funciona) parts.push(`O que NÃO funciona: ${intelligence.o_que_nao_funciona}`);
    if (intelligence.referencias_visuais) parts.push(`Referências Visuais: ${intelligence.referencias_visuais}`);
  }

  return parts.length > 0 ? parts.join('\n') : '';
}
