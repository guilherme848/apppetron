// CONTEXTO DO CLIENTE PARA AGENTES DE IA
// Endpoint sugerido: GET /api/cliente/{id}/contexto-ia
// Retorna objeto consolidado com:
// {
//   links: cliente_links (instagram, site, gmb, outros),
//   concorrentes: cliente_concorrentes (nome, urls, obs),
//   arquivos: cliente_anexos (nome, categoria, url, tipo),
//   cliente: { nome, nicho, plano, verba, cidade }
// }

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LinkTipo = 'instagram' | 'site' | 'google_meu_negocio' | 'outro';
export type AnexoCategoria = 'logo' | 'contrato' | 'briefing' | 'midia' | 'documento' | 'outro';

export interface ClienteLink {
  id: string;
  cliente_id: string;
  tipo: LinkTipo;
  label: string | null;
  url: string;
  ordem: number;
  created_at: string;
}

export interface ClienteConcorrente {
  id: string;
  cliente_id: string;
  nome: string;
  instagram_url: string | null;
  site_url: string | null;
  observacoes: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface ClienteAnexo {
  id: string;
  cliente_id: string;
  nome: string;
  categoria: AnexoCategoria | null;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  arquivo_tamanho: number | null;
  descricao: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useClientIntelligence(clienteId: string | null | undefined) {
  const [links, setLinks] = useState<ClienteLink[]>([]);
  const [concorrentes, setConcorrentes] = useState<ClienteConcorrente[]>([]);
  const [anexos, setAnexos] = useState<ClienteAnexo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!clienteId) { setLoading(false); return; }
    setLoading(true);

    const [linksRes, concRes, anexosRes] = await Promise.all([
      supabase.from('cliente_links').select('*').eq('cliente_id', clienteId).order('ordem'),
      supabase.from('cliente_concorrentes').select('*').eq('cliente_id', clienteId).order('ordem'),
      supabase.from('cliente_anexos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false }),
    ]);

    if (linksRes.data) setLinks(linksRes.data as ClienteLink[]);
    if (concRes.data) setConcorrentes(concRes.data as ClienteConcorrente[]);
    if (anexosRes.data) setAnexos(anexosRes.data as ClienteAnexo[]);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Links ---
  const upsertLink = async (link: Partial<ClienteLink> & { tipo: LinkTipo; url: string }) => {
    if (!clienteId) return;
    if (link.id) {
      const { error } = await supabase.from('cliente_links').update({ tipo: link.tipo, label: link.label ?? null, url: link.url, ordem: link.ordem ?? 0 }).eq('id', link.id);
      if (error) { toast.error('Erro ao atualizar link'); return; }
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, ...link } as ClienteLink : l));
    } else {
      const { data, error } = await supabase.from('cliente_links').insert({ cliente_id: clienteId, tipo: link.tipo, label: link.label ?? null, url: link.url, ordem: link.ordem ?? 0 }).select().single();
      if (error) { toast.error('Erro ao salvar link'); return; }
      setLinks(prev => [...prev, data as ClienteLink]);
    }
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from('cliente_links').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir link'); return; }
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  // --- Concorrentes ---
  const upsertConcorrente = async (c: Partial<ClienteConcorrente> & { nome: string }) => {
    if (!clienteId) return;
    if (c.id) {
      const { error } = await supabase.from('cliente_concorrentes').update({ nome: c.nome, instagram_url: c.instagram_url ?? null, site_url: c.site_url ?? null, observacoes: c.observacoes ?? null }).eq('id', c.id);
      if (error) { toast.error('Erro ao atualizar concorrente'); return; }
      setConcorrentes(prev => prev.map(x => x.id === c.id ? { ...x, ...c } as ClienteConcorrente : x));
    } else {
      const { data, error } = await supabase.from('cliente_concorrentes').insert({ cliente_id: clienteId, nome: c.nome, instagram_url: c.instagram_url ?? null, site_url: c.site_url ?? null, observacoes: c.observacoes ?? null }).select().single();
      if (error) { toast.error('Erro ao salvar concorrente'); return; }
      setConcorrentes(prev => [...prev, data as ClienteConcorrente]);
      return data as ClienteConcorrente;
    }
  };

  const deleteConcorrente = async (id: string) => {
    const { error } = await supabase.from('cliente_concorrentes').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir concorrente'); return; }
    setConcorrentes(prev => prev.filter(c => c.id !== id));
  };

  // --- Anexos ---
  const uploadAnexo = async (
    file: File,
    nome: string,
    categoria: AnexoCategoria,
    descricao?: string,
    onProgress?: (pct: number) => void
  ) => {
    if (!clienteId) return;
    const fileExt = file.name.split('.').pop();
    const filePath = `${clienteId}/${crypto.randomUUID()}_${file.name}`;

    onProgress?.(10);
    const { error: uploadError } = await supabase.storage.from('cliente-anexos').upload(filePath, file);
    if (uploadError) { toast.error('Erro no upload do arquivo'); return; }

    onProgress?.(70);
    const { data: urlData } = supabase.storage.from('cliente-anexos').getPublicUrl(filePath);

    const { data, error } = await supabase.from('cliente_anexos').insert({
      cliente_id: clienteId,
      nome,
      categoria,
      arquivo_url: urlData.publicUrl,
      arquivo_nome: file.name,
      arquivo_tipo: file.type,
      arquivo_tamanho: file.size,
      descricao: descricao || null,
    }).select().single();

    if (error) { toast.error('Erro ao salvar arquivo'); return; }
    onProgress?.(100);
    setAnexos(prev => [data as ClienteAnexo, ...prev]);
    toast.success('Arquivo enviado com sucesso!');
    return data as ClienteAnexo;
  };

  const deleteAnexo = async (id: string, arquivoUrl: string) => {
    // Extract path from URL
    const pathMatch = arquivoUrl.split('/cliente-anexos/')[1];
    if (pathMatch) {
      await supabase.storage.from('cliente-anexos').remove([decodeURIComponent(pathMatch)]);
    }
    const { error } = await supabase.from('cliente_anexos').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir arquivo'); return; }
    setAnexos(prev => prev.filter(a => a.id !== id));
    toast.success('Arquivo excluído');
  };

  return {
    links, concorrentes, anexos, loading,
    upsertLink, deleteLink,
    upsertConcorrente, deleteConcorrente,
    uploadAnexo, deleteAnexo,
    refetch: fetchAll,
  };
}
