import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { Calendar, Clock, ArrowRight, Trash2, Save } from 'lucide-react';
import { ContentJobWithPendingCount, ContentJobHistory, ContentStage, PRIORITY_OPTIONS } from '@/types/contentBoard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContentJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ContentJobWithPendingCount | null;
  stages: ContentStage[];
  teamMembers: { id: string; name: string }[];
  onUpdate: (jobId: string, updates: Partial<ContentJobWithPendingCount>) => Promise<void>;
  onDelete: (jobId: string) => Promise<void>;
  fetchHistory: (jobId: string) => Promise<ContentJobHistory[]>;
}

export function ContentJobModal({
  open,
  onOpenChange,
  job,
  stages,
  teamMembers,
  onUpdate,
  onDelete,
  fetchHistory,
}: ContentJobModalProps) {
  const [history, setHistory] = useState<ContentJobHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    status_label: '',
    notes: '',
  });

  useEffect(() => {
    if (job && open) {
      setFormData({
        assigned_to: job.assigned_to || '',
        due_date: job.due_date || '',
        priority: job.priority || 'medium',
        status_label: job.status_label || '',
        notes: job.notes || '',
      });
      setEditMode(false);

      // Fetch history
      setLoadingHistory(true);
      fetchHistory(job.id).then((data) => {
        setHistory(data);
        setLoadingHistory(false);
      });
    }
  }, [job, open, fetchHistory]);

  if (!job) return null;

  const handleSave = async () => {
    await onUpdate(job.id, {
      assigned_to: formData.assigned_to || null,
      due_date: formData.due_date || null,
      priority: formData.priority as any,
      status_label: formData.status_label || null,
      notes: formData.notes || null,
    });
    setEditMode(false);
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja remover este cliente do quadro?')) {
      await onDelete(job.id);
      onOpenChange(false);
    }
  };

  const currentStage = stages.find((s) => s.id === job.stage_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {job.client?.name || 'Cliente'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {currentStage && (
                <Badge variant="info">{currentStage.name}</Badge>
              )}
              <Badge variant="muted">{job.month_ref}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Quick info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    {editMode ? (
                      <Select
                        value={formData.assigned_to || 'none'}
                        onValueChange={(value) =>
                          setFormData({ ...formData, assigned_to: value === 'none' ? '' : value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {job.assignee ? (
                          <>
                            <MemberAvatar name={job.assignee.name} photoPath={null} size="sm" />
                            <span className="text-sm">{job.assignee.name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Não definido</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Deadline</Label>
                    {editMode ? (
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {job.due_date
                          ? format(new Date(job.due_date), "dd 'de' MMMM", { locale: ptBR })
                          : 'Não definido'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    {editMode ? (
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={job.priority === 'urgent' ? 'strong' : job.priority === 'high' ? 'attention' : 'neutral'}>
                        {PRIORITY_OPTIONS.find((p) => p.value === job.priority)?.label || 'Normal'}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Status Label</Label>
                    {editMode ? (
                      <Input
                        value={formData.status_label}
                        onChange={(e) => setFormData({ ...formData, status_label: e.target.value })}
                        placeholder="Ex: Aguardando cliente"
                      />
                    ) : (
                      <span className="text-sm">
                        {job.status_label || <span className="text-muted-foreground">Nenhum</span>}
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Observações</Label>
                  {editMode ? (
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notas sobre este cliente..."
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {job.notes || 'Sem observações'}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Pending tasks info */}
                {job.pending_count > 0 && (
                  <div className="p-4 bg-warning/10 rounded-lg">
                    <p className="text-sm font-medium text-warning">
                      {job.pending_count} tarefa{job.pending_count > 1 ? 's' : ''} pendente{job.pending_count > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-warning mt-1">
                      Posts e itens do cliente neste mês que ainda não foram concluídos.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Remover
              </Button>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setEditMode(true)}>
                    Editar
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {loadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico de movimentação
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex gap-3 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0 mt-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          {item.from_stage ? (
                            <>
                              <Badge variant="muted" className="text-xs">
                                {item.from_stage.name}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            </>
                          ) : (
                            <span className="text-muted-foreground">Criado em</span>
                          )}
                          <Badge variant="info" className="text-xs">
                            {item.to_stage?.name}
                          </Badge>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.changed_by && (
                            <>
                              <MemberAvatar name={item.changed_by.name} photoPath={null} size="sm" />
                              <span>{item.changed_by.name}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>
                            {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
