import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Pencil, Check, Upload, Trash2, File } from 'lucide-react';
import { InteligenciaCliente, ArquivoInteligencia } from '@/hooks/useClientIntelligenceExpanded';
import { cn } from '@/lib/utils';

interface InfoGeraisCardProps {
  inteligencia: InteligenciaCliente | null;
  arquivos: ArquivoInteligencia[];
  loading: boolean;
  onSave: (data: Partial<InteligenciaCliente>) => Promise<void>;
  onUpload: (file: File, titulo: string, categoria: string) => Promise<any>;
  onDeleteFile: (id: string, url: string) => Promise<void>;
}

const TOM_SUGESTOES = [
  'Direto e popular',
  'Técnico e premium',
  'Próximo e familiar',
  'Jovem e descontraído',
  'Sério e profissional',
];

const POSICIONAMENTO_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'premium', label: 'Premium' },
];

export function InfoGeraisCard({ inteligencia, arquivos, loading, onSave, onUpload, onDeleteFile }: InfoGeraisCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    diferencial: '',
    tom_de_voz: '',
    o_que_funciona: '',
    o_que_nao_funciona: '',
    referencias_visuais: '',
    posicionamento: '',
    observacoes_gerais: '',
  });

  useEffect(() => {
    if (inteligencia) {
      setForm({
        diferencial: inteligencia.diferencial || '',
        tom_de_voz: inteligencia.tom_de_voz || '',
        o_que_funciona: inteligencia.o_que_funciona || '',
        o_que_nao_funciona: inteligencia.o_que_nao_funciona || '',
        referencias_visuais: inteligencia.referencias_visuais || '',
        posicionamento: inteligencia.posicionamento || '',
        observacoes_gerais: inteligencia.observacoes_gerais || '',
      });
    }
  }, [inteligencia]);

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  const infoFiles = arquivos.filter(a => a.categoria === 'informacoes_gerais');
  const hasData = form.diferencial || form.tom_de_voz || form.o_que_funciona;

  if (loading) return <Card className="rounded-2xl"><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Info className="h-4 w-4 text-[hsl(var(--success))]" />Informações Gerais
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
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Diferencial Competitivo</Label>
              <Input value={form.diferencial} onChange={e => setForm(f => ({ ...f, diferencial: e.target.value.slice(0, 200) }))} placeholder="O que diferencia essa empresa?" maxLength={200} />
              <p className="text-[10px] text-muted-foreground text-right mt-0.5">{form.diferencial.length}/200</p>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Tom de Voz</Label>
              <Input value={form.tom_de_voz} onChange={e => setForm(f => ({ ...f, tom_de_voz: e.target.value }))} placeholder="Como essa empresa se comunica?" list="tom-suggestions" />
              <datalist id="tom-suggestions">
                {TOM_SUGESTOES.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">O Que Funciona</Label>
              <Textarea value={form.o_que_funciona} onChange={e => setForm(f => ({ ...f, o_que_funciona: e.target.value }))} placeholder="Que tipo de conteúdo já deu resultado?" className="min-h-[60px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">O Que Não Funciona</Label>
              <Textarea value={form.o_que_nao_funciona} onChange={e => setForm(f => ({ ...f, o_que_nao_funciona: e.target.value }))} placeholder="O que evitar?" className="min-h-[60px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Referências Visuais</Label>
              <Textarea value={form.referencias_visuais} onChange={e => setForm(f => ({ ...f, referencias_visuais: e.target.value }))} placeholder="Descreva referências visuais da marca..." className="min-h-[60px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Posicionamento</Label>
              <div className="flex gap-2">
                {POSICIONAMENTO_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, posicionamento: opt.value }))}
                    className={cn(
                      'flex-1 py-2 px-3 text-[13px] font-medium rounded-lg border transition-all',
                      form.posicionamento === opt.value
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Observações</Label>
              <Textarea value={form.observacoes_gerais} onChange={e => setForm(f => ({ ...f, observacoes_gerais: e.target.value }))} placeholder="Observações adicionais..." className="min-h-[60px] resize-y" />
            </div>
          </>
        ) : (
          !hasData ? (
            <div className="text-center py-4">
              <Info className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">Nenhuma informação cadastrada</p>
              <Button variant="link" size="sm" onClick={() => setEditing(true)} className="text-primary mt-1">Preencher agora</Button>
            </div>
          ) : (
            <div className="space-y-3 text-[13px]">
              {form.diferencial && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Diferencial</p><p className="text-foreground">{form.diferencial}</p></div>}
              {form.tom_de_voz && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Tom de Voz</p><p className="text-foreground">{form.tom_de_voz}</p></div>}
              {form.posicionamento && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Posicionamento</p><p className="text-foreground capitalize">{form.posicionamento}</p></div>}
              {form.o_que_funciona && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">O que Funciona</p><p className="text-foreground">{form.o_que_funciona}</p></div>}
              {form.o_que_nao_funciona && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">O que Não Funciona</p><p className="text-foreground">{form.o_que_nao_funciona}</p></div>}
              {form.referencias_visuais && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Referências Visuais</p><p className="text-foreground">{form.referencias_visuais}</p></div>}
            </div>
          )
        )}

        {/* Info Files */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Arquivos</p>
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if (file) await onUpload(file, file.name.replace(/\.[^/.]+$/, ''), 'informacoes_gerais');
                e.target.value = '';
              }} />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <Upload className="h-3 w-3" />Enviar
              </span>
            </label>
          </div>
          {infoFiles.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum arquivo</p>
          ) : (
            <div className="space-y-1">
              {infoFiles.map(f => (
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
