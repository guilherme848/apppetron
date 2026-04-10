import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, Phone, User } from 'lucide-react';
import { RhLayout } from '@/components/rh/RhLayout';
import { useRh } from '@/contexts/RhContext';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { APPLICATION_STATUS_LABEL } from '@/types/rh';

export default function RhCandidatesList() {
  const navigate = useNavigate();
  const { candidates, applications, jobs, loading } = useRh();
  const [search, setSearch] = useState('');
  const [jobFilter, setJobFilter] = useState<string>('all');

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
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        candidate.full_name.toLowerCase().includes(q) ||
        candidate.email.toLowerCase().includes(q) ||
        (candidate.phone || '').includes(q)
      );
    });
  }, [candidatesWithApps, search, jobFilter]);

  const getJobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title || '—';

  return (
    <RhLayout
      title="Candidatos"
      description={`${candidates.length} candidatos no banco`}
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RhLayout>
  );
}
