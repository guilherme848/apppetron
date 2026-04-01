import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Plus, Trash2, GripVertical, ChevronDown, Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EtapaTemplate {
  id: string;
  ordem: number;
  nome: string;
  ativo: boolean;
}

interface AtividadeTemplate {
  id: string;
  etapa_id: string;
  ordem: number;
  nome: string;
  ativo: boolean;
}

function useOnboardingTemplates() {
  return useQuery({
    queryKey: ['onboarding-etapas-templates'],
    queryFn: async () => {
      const { data: etapas, error: etapasError } = await supabase
        .from('onboarding_etapas_template')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      if (etapasError) throw etapasError;

      const { data: atividades, error: atError } = await supabase
        .from('onboarding_atividades_template')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      if (atError) throw atError;

      return {
        etapas: (etapas || []) as EtapaTemplate[],
        atividades: (atividades || []) as AtividadeTemplate[],
      };
    },
  });
}

export default function OnboardingActivitiesConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useOnboardingTemplates();

  // Local editing state
  const [etapas, setEtapas] = useState<(EtapaTemplate & { activities: AtividadeTemplate[] })[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync from server
  useEffect(() => {
    if (!data) return;
    const mapped = data.etapas.map(e => ({
      ...e,
      activities: data.atividades
        .filter(a => a.etapa_id === e.id)
        .sort((a, b) => a.ordem - b.ordem),
    }));
    setEtapas(mapped);
    setDirty(false);
  }, [data]);

  const [openStages, setOpenStages] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!data) return;
    const init: Record<string, boolean> = {};
    data.etapas.forEach(e => { init[e.id] = true; });
    setOpenStages(init);
  }, [data?.etapas.length]);

  const updateEtapaNome = (etapaId: string, nome: string) => {
    setEtapas(prev => prev.map(e => e.id === etapaId ? { ...e, nome } : e));
    setDirty(true);
  };

  const updateAtividadeNome = (atividadeId: string, nome: string) => {
    setEtapas(prev => prev.map(e => ({
      ...e,
      activities: e.activities.map(a => a.id === atividadeId ? { ...a, nome } : a),
    })));
    setDirty(true);
  };

  const addAtividade = (etapaId: string) => {
    const newAt: AtividadeTemplate = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      etapa_id: etapaId,
      ordem: 0,
      nome: '',
      ativo: true,
    };
    setEtapas(prev => prev.map(e => {
      if (e.id !== etapaId) return e;
      const updated = [...e.activities, { ...newAt, ordem: e.activities.length + 1 }];
      return { ...e, activities: updated };
    }));
    setDirty(true);
  };

  const removeAtividade = (etapaId: string, atividadeId: string) => {
    setEtapas(prev => prev.map(e => {
      if (e.id !== etapaId) return e;
      const filtered = e.activities.filter(a => a.id !== atividadeId);
      return { ...e, activities: filtered.map((a, i) => ({ ...a, ordem: i + 1 })) };
    }));
    setDirty(true);
  };

  const addEtapa = () => {
    const newEtapa: EtapaTemplate & { activities: AtividadeTemplate[] } = {
      id: `new-${Date.now()}`,
      ordem: etapas.length + 1,
      nome: '',
      ativo: true,
      activities: [],
    };
    setEtapas(prev => [...prev, newEtapa]);
    setOpenStages(prev => ({ ...prev, [newEtapa.id]: true }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Soft-delete all existing etapas and atividades
      await supabase.from('onboarding_atividades_template').update({ ativo: false } as any).neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('onboarding_etapas_template').update({ ativo: false } as any).neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Upsert etapas
      for (let i = 0; i < etapas.length; i++) {
        const e = etapas[i];
        const isNew = e.id.startsWith('new-');

        if (isNew) {
          const { data: inserted, error } = await supabase
            .from('onboarding_etapas_template')
            .insert({ nome: e.nome, ordem: i + 1, ativo: true })
            .select()
            .single();
          if (error) throw error;
          e.id = inserted.id;
          // Update activities etapa_id
          e.activities.forEach(a => { a.etapa_id = inserted.id; });
        } else {
          await supabase
            .from('onboarding_etapas_template')
            .update({ nome: e.nome, ordem: i + 1, ativo: true, updated_at: new Date().toISOString() } as any)
            .eq('id', e.id);
        }

        // 3. Upsert activities for this etapa
        for (let j = 0; j < e.activities.length; j++) {
          const a = e.activities[j];
          const isNewA = a.id.startsWith('new-');

          if (isNewA) {
            await supabase
              .from('onboarding_atividades_template')
              .insert({ etapa_id: e.id, nome: a.nome, ordem: j + 1, ativo: true });
          } else {
            await supabase
              .from('onboarding_atividades_template')
              .update({ etapa_id: e.id, nome: a.nome, ordem: j + 1, ativo: true, updated_at: new Date().toISOString() } as any)
              .eq('id', a.id);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['onboarding-etapas-templates'] });
      setDirty(false);
      toast({ title: 'Alterações salvas com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const totalActivities = etapas.reduce((sum, e) => sum + e.activities.length, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Atividades de Onboarding</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as etapas e atividades aplicadas a novos onboardings. Total: {totalActivities} atividades em {etapas.length} etapas.
        </p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-3 px-4 rounded-xl border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.08)]">
        <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] mt-0.5 shrink-0" />
        <p className="text-[13px] text-muted-foreground">
          Alterações se aplicam apenas a <strong>novos onboardings</strong>. Onboardings em andamento não serão afetados.
        </p>
      </div>

      {/* Stages */}
      {etapas.map((etapa, stageIdx) => {
        const isOpen = openStages[etapa.id] !== false;

        return (
          <Card
            key={etapa.id}
            className="animate-fade-in"
            style={{ animationDelay: `${stageIdx * 60}ms`, animationFillMode: 'both' }}
          >
            <Collapsible
              open={isOpen}
              onOpenChange={() => setOpenStages(prev => ({ ...prev, [etapa.id]: !prev[etapa.id] }))}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    !isOpen && '-rotate-90'
                  )} />
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      Etapa {stageIdx + 1}
                    </span>
                    <Input
                      value={etapa.nome}
                      onChange={(e) => { e.stopPropagation(); updateEtapaNome(etapa.id, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 text-sm font-semibold max-w-xs"
                      placeholder="Nome da etapa..."
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{etapa.activities.length} atividades</span>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 space-y-1">
                  {etapa.activities.map((at, idx) => (
                    <div
                      key={at.id}
                      className="flex items-center gap-2 h-11 px-3 border-b border-border/40 group"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                      <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{idx + 1}.</span>
                      <Input
                        value={at.nome}
                        onChange={(e) => updateAtividadeNome(at.id, e.target.value)}
                        className="h-8 text-sm flex-1 border-transparent bg-transparent hover:border-border focus:border-border"
                        placeholder="Nome da atividade..."
                      />
                      <button
                        type="button"
                        onClick={() => removeAtividade(etapa.id, at.id)}
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addAtividade(etapa.id)}
                    className="mt-2 text-primary hover:text-primary/80 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar atividade
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Add stage button */}
      <Button variant="outline" onClick={addEtapa} className="gap-2">
        <Plus className="h-4 w-4" />
        Nova Etapa
      </Button>

      {/* Sticky save footer */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t p-4 flex items-center justify-end gap-3 animate-fade-in">
          <span className="text-sm text-muted-foreground">Alterações não salvas</span>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      )}
    </div>
  );
}
