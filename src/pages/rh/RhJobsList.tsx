import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Users, Briefcase } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { JOB_STATUS_LABEL } from '@/types/rh';

export default function RhJobsList() {
  const navigate = useNavigate();
  const { jobs, profiles, loading, createJobFromProfile, deleteJob } = useRh();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [newJobTitle, setNewJobTitle] = useState('');

  const filtered = jobs.filter((j) =>
    (j.title + ' ' + j.slug).toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!selectedProfileId) {
      toast.error('Selecione uma função base');
      return;
    }
    try {
      const jobId = await createJobFromProfile(selectedProfileId, {
        title: newJobTitle || undefined,
      });
      toast.success('Vaga criada');
      setCreateOpen(false);
      setNewJobTitle('');
      setSelectedProfileId('');
      navigate(`/rh/vagas/${jobId}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar vaga');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJob(id);
      toast.success('Vaga removida');
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao remover');
    }
  };

  const activeProfiles = profiles.filter((p) => p.status === 'active');

  return (
    <RhLayout
      title="Vagas"
      description="Processos seletivos ativos e histórico"
      actions={
        <Button onClick={() => setCreateOpen(true)} disabled={activeProfiles.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Vaga
        </Button>
      }
    >
      <div className="space-y-4">
        {activeProfiles.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Briefcase className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Antes de criar vagas, você precisa cadastrar pelo menos uma Função.
              </p>
              <Button onClick={() => navigate('/rh/funcoes')}>Ir para Funções</Button>
            </CardContent>
          </Card>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
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
                  <TableHead>Status</TableHead>
                  <TableHead>Candidatos</TableHead>
                  <TableHead>Contratados</TableHead>
                  <TableHead>Criada em</TableHead>
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
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhuma vaga encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((j) => (
                    <TableRow
                      key={j.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/rh/vagas/${j.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{j.title}</div>
                        <div className="text-xs text-muted-foreground">/{j.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            j.status === 'open'
                              ? 'default'
                              : j.status === 'draft'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {JOB_STATUS_LABEL[j.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {j.candidates_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{j.hired_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(j.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigate(`/rh/vagas/${j.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDelete(j.id)}
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

      {/* Modal criar vaga */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Vaga</DialogTitle>
            <DialogDescription>
              Selecione a função base — a vaga herdará o pipeline e os dados do perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Função base *</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função..." />
                </SelectTrigger>
                <SelectContent>
                  {activeProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title_internal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título da vaga (opcional)</Label>
              <Input
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder="Deixe vazio para usar o título da função"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Criar Vaga</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover vaga?</DialogTitle>
            <DialogDescription>
              Todas as inscrições e respostas associadas serão removidas. Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
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
