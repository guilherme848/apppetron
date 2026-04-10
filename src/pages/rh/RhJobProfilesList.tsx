import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  KanbanSquare,
  ExternalLink,
  Copy,
  BriefcaseBusiness,
} from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { SENIORITY_LABEL } from '@/types/rh';

export default function RhJobProfilesList() {
  const navigate = useNavigate();
  const { profiles, applications, jobs, loading, createProfile, updateProfile, deleteProfile } =
    useRh();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const publicUrl = `${window.location.origin}/trabalhe-conosco`;

  // Contar candidatos por profile (via job.job_profile_id → applications)
  const candidatesCountMap = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((j) => {
      if (!j.job_profile_id) return;
      const count = applications.filter((a) => a.job_id === j.id).length;
      map.set(j.job_profile_id, (map.get(j.job_profile_id) || 0) + count);
    });
    return map;
  }, [jobs, applications]);

  const filtered = profiles.filter((p) =>
    (p.title_internal + ' ' + p.title_public + ' ' + (p.department || ''))
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openCount = profiles.filter((p) => p.accepting_applications).length;

  const handleCreate = async () => {
    try {
      const profile = await createProfile({
        title_internal: 'Nova Vaga',
        title_public: 'Nova Vaga',
      });
      toast.success('Vaga criada');
      navigate(`/rh/vagas/${profile.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar vaga');
    }
  };

  const handleToggleAccepting = async (id: string, value: boolean) => {
    try {
      await updateProfile(id, { accepting_applications: value });
      toast.success(value ? 'Processo seletivo aberto' : 'Processo seletivo fechado');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile(id);
      toast.success('Vaga removida');
      setConfirmDelete(null);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao remover');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link da página pública copiado');
  };

  return (
    <RhLayout
      title="Vagas"
      description={`${openCount} de ${profiles.length} com processo seletivo aberto`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar link público
          </Button>
          <Button variant="outline" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir página
            </a>
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Button>
        </div>
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
                  <TableHead>Vaga</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Senioridade</TableHead>
                  <TableHead>Processo seletivo</TableHead>
                  <TableHead>Candidatos</TableHead>
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
                      <BriefcaseBusiness className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">Nenhuma vaga cadastrada.</p>
                      <Button onClick={handleCreate} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Criar primeira vaga
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const candidates = candidatesCountMap.get(p.id) || 0;
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/rh/vagas/${p.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{p.title_internal}</div>
                          {p.short_pitch && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {p.short_pitch}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{p.department || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{SENIORITY_LABEL[p.seniority]}</Badge>
                          {p.requires_experience && (
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                              Exp. obrig.
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Switch
                              checked={p.accepting_applications}
                              onCheckedChange={(v) => handleToggleAccepting(p.id, v)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {p.accepting_applications ? 'Recebendo' : 'Fechado'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {candidates}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Ver candidatos (kanban)"
                              onClick={() => navigate(`/rh/vagas/${p.id}?view=kanban`)}
                            >
                              <KanbanSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Editar vaga"
                              onClick={() => navigate(`/rh/vagas/${p.id}?view=edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Remover"
                              onClick={() => setConfirmDelete(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover vaga?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. Candidatos já inscritos continuam no banco, mas a vaga deixa de aparecer na página pública.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RhLayout>
  );
}
