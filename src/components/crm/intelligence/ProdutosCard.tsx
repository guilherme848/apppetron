import { useState, useEffect, KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Pencil, Check, Upload, Trash2, File, X } from 'lucide-react';
import { InteligenciaCliente, ArquivoInteligencia } from '@/hooks/useClientIntelligenceExpanded';

interface ProdutosCardProps {
  inteligencia: InteligenciaCliente | null;
  arquivos: ArquivoInteligencia[];
  loading: boolean;
  onSave: (data: Partial<InteligenciaCliente>) => Promise<void>;
  onUpload: (file: File, titulo: string, categoria: string) => Promise<any>;
  onDeleteFile: (id: string, url: string) => Promise<void>;
}

export function ProdutosCard({ inteligencia, arquivos, loading, onSave, onUpload, onDeleteFile }: ProdutosCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    produtos_especialidades: [] as string[],
    produtos_marcas: '',
    produtos_carro_chefe: '',
    produtos_mix_resumo: '',
    produtos_observacoes: '',
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (inteligencia) {
      setForm({
        produtos_especialidades: inteligencia.produtos_especialidades || [],
        produtos_marcas: inteligencia.produtos_marcas || '',
        produtos_carro_chefe: inteligencia.produtos_carro_chefe || '',
        produtos_mix_resumo: inteligencia.produtos_mix_resumo || '',
        produtos_observacoes: inteligencia.produtos_observacoes || '',
      });
    }
  }, [inteligencia]);

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.produtos_especialidades.includes(tag)) {
      setForm(f => ({ ...f, produtos_especialidades: [...f.produtos_especialidades, tag] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, produtos_especialidades: f.produtos_especialidades.filter(t => t !== tag) }));
  };

  const handleTagKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  const prodFiles = arquivos.filter(a => a.categoria === 'produtos_servicos');
  const hasData = form.produtos_especialidades.length > 0 || form.produtos_carro_chefe || form.produtos_marcas;

  if (loading) return <Card className="rounded-2xl"><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Package className="h-4 w-4 text-[hsl(var(--info))]" />Produtos e Serviços
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
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Especialidades</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.produtos_especialidades.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border border-[hsl(var(--info)/.25)]">
                    {tag}
                    <button onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} onBlur={addTag} placeholder="Digite e pressione Enter para adicionar..." />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Marcas Principais</Label>
              <Textarea value={form.produtos_marcas} onChange={e => setForm(f => ({ ...f, produtos_marcas: e.target.value }))} placeholder="Quais marcas a empresa trabalha?" className="min-h-[60px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Carro-Chefe</Label>
              <Textarea value={form.produtos_carro_chefe} onChange={e => setForm(f => ({ ...f, produtos_carro_chefe: e.target.value }))} placeholder="Quais são os produtos/serviços mais fortes?" className="min-h-[60px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Mix Resumido</Label>
              <Textarea value={form.produtos_mix_resumo} onChange={e => setForm(f => ({ ...f, produtos_mix_resumo: e.target.value }))} placeholder="Descreva o mix de produtos/serviços..." className="min-h-[60px] resize-y" />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-muted-foreground mb-1.5 block">Observações</Label>
              <Textarea value={form.produtos_observacoes} onChange={e => setForm(f => ({ ...f, produtos_observacoes: e.target.value }))} placeholder="Observações adicionais..." className="min-h-[60px] resize-y" />
            </div>
          </>
        ) : (
          !hasData ? (
            <div className="text-center py-4">
              <Package className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">Nenhum produto cadastrado</p>
              <Button variant="link" size="sm" onClick={() => setEditing(true)} className="text-primary mt-1">Preencher agora</Button>
            </div>
          ) : (
            <div className="space-y-3 text-[13px]">
              {form.produtos_especialidades.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold mb-1">Especialidades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.produtos_especialidades.map(tag => (
                      <span key={tag} className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border border-[hsl(var(--info)/.25)]">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {form.produtos_marcas && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Marcas</p><p className="text-foreground">{form.produtos_marcas}</p></div>}
              {form.produtos_carro_chefe && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Carro-Chefe</p><p className="text-foreground">{form.produtos_carro_chefe}</p></div>}
              {form.produtos_mix_resumo && <div><p className="text-[11px] text-muted-foreground uppercase font-semibold">Mix</p><p className="text-foreground">{form.produtos_mix_resumo}</p></div>}
            </div>
          )
        )}

        {/* Product Files */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Arquivos de Produtos</p>
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if (file) await onUpload(file, file.name.replace(/\.[^/.]+$/, ''), 'produtos_servicos');
                e.target.value = '';
              }} />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <Upload className="h-3 w-3" />Enviar
              </span>
            </label>
          </div>
          {prodFiles.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum arquivo de produtos</p>
          ) : (
            <div className="space-y-1">
              {prodFiles.map(f => (
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
