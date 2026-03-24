import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InteligenciaCliente {
  id: string;
  cliente_id: string;
  icp_descricao: string | null;
  icp_perfil_comprador: string | null;
  icp_comportamento: string | null;
  icp_ticket_medio: string | null;
  icp_observacoes: string | null;
  produtos_especialidades: string[] | null;
  produtos_marcas: string | null;
  produtos_carro_chefe: string | null;
  produtos_mix_resumo: string | null;
  produtos_observacoes: string | null;
  diferencial: string | null;
  tom_de_voz: string | null;
  o_que_funciona: string | null;
  o_que_nao_funciona: string | null;
  referencias_visuais: string | null;
  posicionamento: string | null;
  observacoes_gerais: string | null;
  preenchido_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArquivoInteligencia {
  id: string;
  cliente_id: string;
  titulo: string;
  categoria: string;
  descricao: string | null;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  arquivo_tamanho: number | null;
  enviado_por: string | null;
  created_at: string;
}

export interface AcaoComercial {
  id: string;
  cliente_id: string;
  produto: string;
  tipo_acao: string | null;
  descricao: string | null;
  periodo: string | null;
  performou_bem: boolean | null;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
}

export function useClientIntelligenceExpanded(clienteId: string | null | undefined) {
  const [inteligencia, setInteligencia] = useState<InteligenciaCliente | null>(null);
  const [arquivos, setArquivos] = useState<ArquivoInteligencia[]>([]);
  const [acoes, setAcoes] = useState<AcaoComercial[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!clienteId) { setLoading(false); return; }
    setLoading(true);

    const [intelRes, arqRes, acoesRes] = await Promise.all([
      supabase.from('inteligencia_cliente').select('*').eq('cliente_id', clienteId).maybeSingle(),
      supabase.from('arquivos_inteligencia_cliente').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
      supabase.from('historico_acoes_comerciais').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
    ]);

    if (intelRes.data) setInteligencia(intelRes.data as unknown as InteligenciaCliente);
    if (arqRes.data) setArquivos(arqRes.data as unknown as ArquivoInteligencia[]);
    if (acoesRes.data) setAcoes(acoesRes.data as unknown as AcaoComercial[]);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upsertInteligencia = async (data: Partial<InteligenciaCliente>) => {
    if (!clienteId) return;
    if (inteligencia?.id) {
      const { error } = await supabase
        .from('inteligencia_cliente')
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', inteligencia.id);
      if (error) { toast.error('Erro ao salvar'); return; }
      setInteligencia(prev => prev ? { ...prev, ...data } as InteligenciaCliente : prev);
    } else {
      const { data: newData, error } = await supabase
        .from('inteligencia_cliente')
        .insert({ cliente_id: clienteId, ...data } as any)
        .select()
        .single();
      if (error) { toast.error('Erro ao salvar'); return; }
      setInteligencia(newData as unknown as InteligenciaCliente);
    }
  };

  const uploadArquivoInteligencia = async (
    file: File,
    titulo: string,
    categoria: string,
    descricao?: string
  ) => {
    if (!clienteId) return;
    const filePath = `${clienteId}/intel/${crypto.randomUUID()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('cliente-anexos').upload(filePath, file);
    if (uploadError) { toast.error('Erro no upload'); return; }

    const { data: urlData } = supabase.storage.from('cliente-anexos').getPublicUrl(filePath);

    const { data, error } = await supabase.from('arquivos_inteligencia_cliente').insert({
      cliente_id: clienteId,
      titulo,
      categoria,
      descricao: descricao || null,
      arquivo_url: urlData.publicUrl,
      arquivo_nome: file.name,
      arquivo_tipo: file.type,
      arquivo_tamanho: file.size,
    } as any).select().single();

    if (error) { toast.error('Erro ao salvar arquivo'); return; }
    setArquivos(prev => [data as unknown as ArquivoInteligencia, ...prev]);
    toast.success('Arquivo enviado!');
    return data as unknown as ArquivoInteligencia;
  };

  const deleteArquivoInteligencia = async (id: string, arquivoUrl: string) => {
    const pathMatch = arquivoUrl.split('/cliente-anexos/')[1];
    if (pathMatch) {
      await supabase.storage.from('cliente-anexos').remove([decodeURIComponent(pathMatch)]);
    }
    const { error } = await supabase.from('arquivos_inteligencia_cliente').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    setArquivos(prev => prev.filter(a => a.id !== id));
  };

  const addAcao = async (acao: Omit<AcaoComercial, 'id' | 'cliente_id' | 'created_at' | 'registrado_por'>) => {
    if (!clienteId) return;
    const { data, error } = await supabase.from('historico_acoes_comerciais').insert({
      cliente_id: clienteId,
      ...acao,
    } as any).select().single();
    if (error) { toast.error('Erro ao registrar ação'); return; }
    setAcoes(prev => [data as unknown as AcaoComercial, ...prev]);
    toast.success('Ação registrada!');
    return data as unknown as AcaoComercial;
  };

  const deleteAcao = async (id: string) => {
    const { error } = await supabase.from('historico_acoes_comerciais').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    setAcoes(prev => prev.filter(a => a.id !== id));
  };

  // Completude calculation
  const completude = (() => {
    if (!inteligencia) return { percent: 0, missing: ['ICP', 'Produtos', 'Diferencial', 'Tom de Voz', 'Carro-Chefe'] };
    const fields = [
      { key: 'icp_descricao', label: 'Descrição do ICP' },
      { key: 'icp_perfil_comprador', label: 'Perfil do Comprador' },
      { key: 'produtos_especialidades', label: 'Especialidades' },
      { key: 'produtos_carro_chefe', label: 'Carro-Chefe' },
      { key: 'diferencial', label: 'Diferencial' },
      { key: 'tom_de_voz', label: 'Tom de Voz' },
      { key: 'o_que_funciona', label: 'O que Funciona' },
      { key: 'posicionamento', label: 'Posicionamento' },
    ];
    const filled = fields.filter(f => {
      const val = (inteligencia as any)[f.key];
      if (Array.isArray(val)) return val.length > 0;
      return val && String(val).trim().length > 0;
    });
    const missing = fields.filter(f => {
      const val = (inteligencia as any)[f.key];
      if (Array.isArray(val)) return !val.length;
      return !val || !String(val).trim();
    }).map(f => f.label);
    return { percent: Math.round((filled.length / fields.length) * 100), missing };
  })();

  return {
    inteligencia,
    arquivos,
    acoes,
    loading,
    completude,
    upsertInteligencia,
    uploadArquivoInteligencia,
    deleteArquivoInteligencia,
    addAcao,
    deleteAcao,
    refetch: fetchAll,
  };
}
