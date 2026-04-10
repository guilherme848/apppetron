import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

export default function RhFormsList() {
  const navigate = useNavigate();
  const { getAllForms, deleteForm } = useRh();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getAllForms();
    setForms(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCopy = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/vagas/${slug}`);
    toast.success('Link copiado');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este formulário? As inscrições existentes continuam preservadas.')) return;
    await deleteForm(id);
    toast.success('Formulário removido');
    load();
  };

  return (
    <RhLayout
      title="Formulários de Inscrição"
      description="Páginas públicas que capturam candidatos"
    >
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum formulário. Crie um a partir da tela de detalhes de uma vaga.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                forms.map((f) => (
                  <TableRow
                    key={f.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/rh/formularios/${f.id}`)}
                  >
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-sm">{f.job?.title || '—'}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        /vagas/{f.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {f.active && <Badge>Ativo</Badge>}
                        {f.public && <Badge variant="outline">Público</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(f.updated_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopy(f.slug)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" asChild>
                          <a
                            href={`/vagas/${f.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(f.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </RhLayout>
  );
}
