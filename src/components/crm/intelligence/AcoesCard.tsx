import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { History, Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { AcaoComercial } from '@/hooks/useClientIntelligenceExpanded';
import { cn } from '@/lib/utils';

interface AcoesCardProps {
  acoes: AcaoComercial[];
  loading: boolean;
  onAdd: (acao: Omit<AcaoComercial, 'id' | 'cliente_id' | 'created_at' | 'registrado_por'>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
}

const TIPO_BADGES: Record<string, string> = {
  promocao: 'bg-primary/12 text-primary border-primary/25',
  lancamento: 'bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)]',
  sazonal: 'bg-purple-500/12 text-purple-600 dark:text-purple-400 border-purple-500/25',
  acao_especial: 'bg-[hsl(var(--warning)/.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/.25)]',
};

const TIPO_LABELS: Record<string, string> = {
  promocao: 'Promoção',
  lancamento: 'Lançamento',
  sazonal: 'Sazonal',
  acao_especial: 'Ação Especial',
};

export function AcoesCard({ acoes, loading, onAdd, onDelete }: AcoesCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    produto: '',
    tipo_acao: 'promocao',
    descricao: '',
    periodo: '',
    performou_bem: true,
    observacao: '',
  });

  const handleSubmit = async () => {
    if (!form.produto.trim()) return;
    await onAdd({
      produto: form.produto,
      tipo_acao: form.tipo_acao,
      descricao: form.descricao || null,
      periodo: form.periodo || null,
      performou_bem: form.performou_bem,
      observacao: form.observacao || null,
    });
    setForm({ produto: '', tipo_acao: 'promocao', descricao: '', periodo: '', performou_bem: true, observacao: '' });
    setModalOpen(false);
  };

  if (loading) return <Card className="rounded-2xl"><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  return (
    <>
      <Card className="rounded-2xl border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-purple-500" />Histórico de Ações Comerciais
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)} className="h-7 px-2 text-[11px]">
              <Plus className="h-3 w-3 mr-1" />Registrar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {acoes.length === 0 ? (
            <div className="text-center py-6">
              <History className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">Nenhuma ação registrada</p>
              <p className="text-[11px] text-muted-foreground mt-1">Registre ofertas e campanhas para melhorar as sugestões da IA</p>
            </div>
          ) : (
            <div className="space-y-2">
              {acoes.map(a => (
                <div key={a.id} className="flex items-start gap-3 bg-muted/40 rounded-lg border border-border/50 p-3 group">
                  {a.performou_bem ? (
                    <CheckCircle className="h-4 w-4 text-[hsl(var(--success))] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-foreground">{a.produto}</p>
                      {a.tipo_acao && (
                        <span className={cn('px-1.5 py-0.5 text-[10px] font-semibold rounded border', TIPO_BADGES[a.tipo_acao] || 'bg-muted text-muted-foreground border-border')}>
                          {TIPO_LABELS[a.tipo_acao] || a.tipo_acao}
                        </span>
                      )}
                    </div>
                    {a.periodo && <p className="text-[11px] text-muted-foreground mt-0.5">{a.periodo}</p>}
                    {a.descricao && <p className="text-[12px] text-muted-foreground mt-1">{a.descricao}</p>}
                    {a.observacao && <p className="text-[11px] text-muted-foreground italic mt-1">{a.observacao}</p>}
                  </div>
                  <button onClick={() => onDelete(a.id)} className="opacity-0 group-hover:opacity-100 p-1 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Registrar Ação Comercial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Produto / Serviço *</Label>
              <Input value={form.produto} onChange={e => setForm(f => ({ ...f, produto: e.target.value }))} placeholder="Nome do produto ou serviço" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Tipo da Ação</Label>
              <Select value={form.tipo_acao} onValueChange={v => setForm(f => ({ ...f, tipo_acao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="promocao">Promoção</SelectItem>
                  <SelectItem value="lancamento">Lançamento</SelectItem>
                  <SelectItem value="sazonal">Sazonal</SelectItem>
                  <SelectItem value="acao_especial">Ação Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva a ação..." className="min-h-[60px]" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Período</Label>
              <Input value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} placeholder="Ex: Março 2025, Black Friday 2024" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.performou_bem} onCheckedChange={v => setForm(f => ({ ...f, performou_bem: v }))} />
              <Label className="text-[13px]">{form.performou_bem ? 'Funcionou bem' : 'Não funcionou'}</Label>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Observação</Label>
              <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Observações sobre o resultado..." className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.produto.trim()}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
