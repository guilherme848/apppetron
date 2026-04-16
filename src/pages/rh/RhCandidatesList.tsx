import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, Phone, User, BookmarkPlus, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { APPLICATION_STATUS_LABEL, type HrApplicationStatus, type HrCandidate } from '@/types/rh';

type StatusFilter = HrApplicationStatus | 'all';

export default function RhCandidatesList() {
  const navigate = useNavigate();
  const { candidates, applications, jobs, loading, deleteCandidate } = useRh();
  const [search, setSearch] = useState('');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [candidateToDelete, setCandidateToDelete] = useState<HrCandidate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!candidateToDelete) return;
    setDeleting(true);
    try {
      await deleteCandidate(candidateToDelete.id);
      toast.success(`Candidato ${candidateToDelete.full_name} excluído`);
      setCandidateToDelete(null);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir candidato');
    } finally {
      setDeleting(false);
    }
  };

  // Mapa email -> candidate (ids únicos)
  const candidatesWithApps = useMemo(() => {
    return candidates.map((c) => {
      const apps = applications.filter((a) => a.candidate_id === c.id);
      return {
        candidate: c,
        applications: apps,
      };
    });
  }, [candidates, applications]);

  const filtered = useMemo(() => {
    return candidatesWithApps.filter(({ candidate, applications }) => {
      if (jobFilter !== 'all' && !applications.some((a) => a.job_id === jobFilter)) {
        return false;
      }
      if (statusFilter !== 'all' && !applications.some((a) => a.status === statusFilter)) {
        return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        candidate.full_name.toLowerCase().includes(q) ||
        candidate.email.toLowerCase().includes(q) ||
        (candidate.phone || '').includes(q)
      );
    });
  }, [candidatesWithApps, search, jobFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: candidatesWithApps.length,
      active: 0,
      hired: 0,
      talent_pool: 0,
      rejected: 0,
    };
    candidatesWithApps.forEach(({ applications: apps }) => {
      if (apps.some((a) => a.status === 'active')) counts.active++;
      if (apps.some((a) => a.status === 'hired')) counts.hired++;
      if (apps.some((a) => a.status === 'talent_pool')) counts.talent_pool++;
      if (apps.some((a) => a.status === 'rejected')) counts.rejected++;
    });
    return counts;
  }, [candidatesWithApps]);

  const getJobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title || '—';

  return (
    <RhLayout
      title="Candidatos"
      description={`${candidates.length} candidatos no banco`}
    >
      <div className="space-y-4">
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          <StatusPill
            label="Todos"
            count={statusCounts.all}
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <StatusPill
            label="Em processo"
            count={statusCounts.active}
            active={statusFilter === 'active'}
            color="primary"
            onClick={() => setStatusFilter('active')}
          />
          <StatusPill
            label="Banco de talentos"
            count={statusCounts.talent_pool}
            active={statusFilter === 'talent_pool'}
            color="amber"
            icon={<BookmarkPlus className="h-3 w-3" />}
            onClick={() => setStatusFilter('talent_pool')}
          />
          <StatusPill
            label="Contratados"
            count={statusCounts.hired}
            active={statusFilter === 'hired'}
            color="green"
            onClick={() => setStatusFilter('hired')}
          />
          <StatusPill
            label="Recusados"
            count={statusCounts.rejected}
            active={statusFilter === 'rejected'}
            color="red"
            onClick={() => setStatusFilter('rejected')}
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por vaga" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as vagas</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Inscrições</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inscrito em</TableHead>
                  <TableHead className="w-[50px]" />
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
                      <User className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum candidato ainda. Compartilhe o link de uma vaga para começar.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(({ candidate, applications }) => {
                    const primaryApp = applications[0];
                    return (
                      <TableRow
                        key={candidate.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (primaryApp) {
                            navigate(`/rh/candidatos/${primaryApp.id}`);
                          }
                        }}
                      >
                        <TableCell>
                          <div className="font-medium">{candidate.full_name}</div>
                          {candidate.city && (
                            <div className="text-xs text-muted-foreground">
                              {candidate.city}
                              {candidate.state && ` - ${candidate.state}`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {candidate.email}
                          </div>
                          {candidate.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {candidate.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {applications.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {applications.slice(0, 2).map((a) => (
                                <Badge key={a.id} variant="outline" className="text-[10px]">
                                  {getJobTitle(a.job_id)}
                                </Badge>
                              ))}
                              {applications.length > 2 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{applications.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {primaryApp && (
                            <Badge
                              variant={
                                primaryApp.status === 'hired'
                                  ? 'default'
                                  : primaryApp.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {APPLICATION_STATUS_LABEL[primaryApp.status]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(candidate.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setCandidateToDelete(candidate);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir candidato
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={!!candidateToDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setCandidateToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir candidato?</AlertDialogTitle>
            <AlertDialogDescription>
              {candidateToDelete && (
                <>
                  Você está prestes a excluir <strong>{candidateToDelete.full_name}</strong>{' '}
                  permanentemente do banco.
                  <br />
                  <br />
                  Isso remove <strong>TODAS as inscrições</strong> dele em qualquer vaga, junto com
                  respostas do formulário, currículo, análises de IA e histórico. Esta ação não
                  pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RhLayout>
  );
}

// ─── Status pill ───────────────────────────────────────────────

function StatusPill({
  label,
  count,
  active,
  color,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: 'primary' | 'green' | 'amber' | 'red';
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  const colorClasses = {
    primary: 'data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary',
    green: 'data-[active=true]:border-green-500/50 data-[active=true]:bg-green-500/10 data-[active=true]:text-green-600 dark:data-[active=true]:text-green-400',
    amber: 'data-[active=true]:border-amber-500/50 data-[active=true]:bg-amber-500/10 data-[active=true]:text-amber-600 dark:data-[active=true]:text-amber-400',
    red: 'data-[active=true]:border-destructive/50 data-[active=true]:bg-destructive/10 data-[active=true]:text-destructive',
  };
  const defaultActive = 'data-[active=true]:border-foreground/40 data-[active=true]:bg-muted data-[active=true]:text-foreground';

  return (
    <button
      data-active={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all border-border bg-card text-muted-foreground hover:bg-muted/50 ${
        color ? colorClasses[color] : defaultActive
      }`}
    >
      {icon}
      {label}
      <span className="text-[10px] opacity-70">{count}</span>
    </button>
  );
}
