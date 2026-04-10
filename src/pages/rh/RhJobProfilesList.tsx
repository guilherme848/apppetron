import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Copy, Archive, Search } from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SENIORITY_LABEL } from '@/types/rh';

export default function RhJobProfilesList() {
  const navigate = useNavigate();
  const { profiles, loading, createProfile, deleteProfile } = useRh();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = profiles.filter((p) =>
    (p.title_internal + ' ' + p.title_public + ' ' + (p.department || ''))
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      const profile = await createProfile({ title_internal: 'Nova Função', title_public: 'Nova Função' });
      toast.success('Função criada');
      navigate(`/rh/funcoes/${profile.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar função');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile(id);
      toast.success('Função removida');
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao remover');
    }
  };

  return (
    <RhLayout
      title="Funções (Job Profiles)"
      description="Templates reutilizáveis de cargos para criar vagas"
      actions={
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Função
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Senioridade</TableHead>
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
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <p className="text-muted-foreground mb-4">Nenhuma função cadastrada ainda.</p>
                      <Button onClick={handleCreate} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Criar primeira função
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/rh/funcoes/${p.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{p.title_internal}</div>
                        {p.title_public !== p.title_internal && (
                          <div className="text-xs text-muted-foreground">{p.title_public}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{p.department || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{SENIORITY_LABEL[p.seniority]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                          {p.status === 'active' ? 'Ativa' : 'Arquivada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.updated_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigate(`/rh/funcoes/${p.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDelete(p.id)}
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
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover função?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. Vagas já criadas a partir desta função não serão afetadas.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RhLayout>
  );
}
