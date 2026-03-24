import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Pencil, Check, Upload, Trash2, File } from 'lucide-react';
import { InteligenciaCliente, ArquivoInteligencia } from '@/hooks/useClientIntelligenceExpanded';

interface ICPCardProps {
  inteligencia: InteligenciaCliente | null;
  arquivos: ArquivoInteligencia[];
  loading: boolean;
  onSave: (data: Partial<InteligenciaCliente>) => Promise<void>;
  onUpload: (file: File, titulo: string, categoria: string) => Promise<any>;
  onDeleteFile: (id: string, url: string) => Promise<void>;
}

export function ICPCard({ inteligencia, arquivos, loading, onSave, onUpload, onDeleteFile }: ICPCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    icp_descricao: '',
    icp_perfil_comprador: '',
    icp_comportamento: '',
    icp_ticket_medio: '',
    icp_observacoes: '',
  });

  useEffect(() => {
    if (inteligencia) {
      setForm({
        icp_descricao: inteligencia.icp_descricao || '',
        icp_perfil_comprador: inteligencia.icp_perfil_comprador || '',
        icp_comportamento: inteligencia.icp_comportamento || '',
        icp_ticket_medio: inteligencia.icp_ticket_medio || '',
        icp_observacoes: inteligencia.icp_observacoes || '',
      });
    }
  }, [inteligencia]);

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  const icpFiles = arquivos.filter(a => a.categoria === 'icp');

  if (loading) return <Card className="rounded-2xl"><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  const hasData = form.icp_descricao || form.icp_perfil_comprador || form.icp_comportamento;

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />ICP — Cliente Ideal
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => editing ? handleSave() : setEditing(true)} className="h-7 px-2">
            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Descrição do Cliente Ideal</Label>
              <Textarea value={form.icp_descricao} onChange={e => setForm(f => ({ ...f, icp_descricao: e.target.value }))} placeholder="Quem é o cliente ideal dessa empresa?" className="min-h-[80px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Perfil do Comprador</Label>
              <Textarea value={form.icp_perfil_comprador} onChange={e => setForm(f => ({ ...f, icp_perfil_comprador: e.target.value }))} placeholder="Ex: Empreiteiro que compra em volume, dono de obra residencial..." className="min-h-[80px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Comportamento de Compra</Label>
              <Textarea value={form.icp_comportamento} onChange={e => setForm(f => ({ ...f, icp_comportamento: e.target.value }))} placeholder="Como esse público compra? Pesquisa preço? Compra por indicação?" className="min-h-[80px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Ticket Médio Estimado</Label>
              <Input value={form.icp_ticket_medio} onChange={e => setForm(f => ({ ...f, icp_ticket_medio: e.target.value }))} placeholder="Ex: R$ 2.000-5.000 por compra" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Observações</Label>
              <Textarea value={form.icp_observacoes} onChange={e => setForm(f => ({ ...f, icp_observacoes: e.target.value }))} placeholder="Informações adicionais..." className="min-h-[60px] resize-y" />
            </div>
          </>
        ) : (
          !hasData ? (
            <div className="text-center py-4">
              <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">Nenhum ICP cadastrado</p>
              <Button variant="link" size="sm" onClick={() => setEditing(true)} className="text-primary mt-1">Preencher agora</Button>
            </div>
          ) : (
            <div className="space-y-3 text-[13px]">
              {form.icp_descricao && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Descrição</p><p className="text-foreground">{form.icp_descricao}</p></div>}
              {form.icp_perfil_comprador && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Perfil do Comprador</p><p className="text-foreground">{form.icp_perfil_comprador}</p></div>}
              {form.icp_comportamento && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Comportamento</p><p className="text-foreground">{form.icp_comportamento}</p></div>}
              {form.icp_ticket_medio && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Ticket Médio</p><p className="text-foreground font-mono">{form.icp_ticket_medio}</p></div>}
              {form.icp_observacoes && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Observações</p><p className="text-foreground">{form.icp_observacoes}</p></div>}
            </div>
          )
        )}

        {/* ICP Files */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Arquivos de ICP</p>
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if (file) await onUpload(file, file.name.replace(/\.[^/.]+$/, ''), 'icp');
                e.target.value = '';
              }} />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <Upload className="h-3 w-3" />Enviar
              </span>
            </label>
          </div>
          {icpFiles.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum arquivo de ICP</p>
          ) : (
            <div className="space-y-1">
              {icpFiles.map(f => (
                <div key={f.id} className="flex items-center gap-2 group text-[12px]">
                  <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={f.arquivo_url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline flex-1">{f.titulo}</a>
                  <button onClick={() => onDeleteFile(f.id, f.arquivo_url)} className="opacity-0 group-hover:opacity-100 p-0.5"><Trash2 className="h-3 w-3 text-destructive" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
