import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Clock, CheckCircle, XCircle, PlayCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RichTextEditor, RichTextViewer } from '@/components/content/RichTextEditor';
import { ContentChangeRequest, ChangeRequestStatus, CHANGE_REQUEST_STATUS_OPTIONS } from '@/types/changeRequest';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ChangeRequestsTabProps {
  requests: ContentChangeRequest[];
  loading: boolean;
  onAddRequest: (commentRich: string) => Promise<any>;
  onUpdateStatus: (id: string, status: ChangeRequestStatus, resolutionNote?: string) => Promise<any>;
  onDelete: (id: string) => Promise<boolean>;
  onPostStatusChange?: (newStatus: 'todo' | 'doing' | 'done') => void;
  currentPostStatus?: string;
}

export function ChangeRequestsTab({
  requests,
  loading,
  onAddRequest,
  onUpdateStatus,
  onDelete,
  onPostStatusChange,
  currentPostStatus,
}: ChangeRequestsTabProps) {
  const { getMemberById } = useTeamMembers();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ContentChangeRequest | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ChangeRequestStatus | null>(null);

  const handleSubmitRequest = async () => {
    if (!newComment.trim() || newComment === '<p></p>') {
      toast.error('Descreva o que deve ser alterado');
      return;
    }

    setSubmitting(true);
    const result = await onAddRequest(newComment);
    if (result) {
      setNewComment('');
      toast.success('Solicitação de alteração criada');
      
      // If post was done, suggest moving to todo
      if (currentPostStatus === 'done' && onPostStatusChange) {
        toast.info('Post marcado como "A Fazer" devido à nova alteração', {
          action: {
            label: 'Desfazer',
            onClick: () => onPostStatusChange('done'),
          },
        });
        onPostStatusChange('todo');
      }
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (request: ContentChangeRequest, newStatus: ChangeRequestStatus) => {
    if (newStatus === 'done') {
      setSelectedRequest(request);
      setPendingStatus(newStatus);
      setResolutionNote('');
      setShowResolutionDialog(true);
      return;
    }
    
    await onUpdateStatus(request.id, newStatus);
    toast.success(`Status alterado para "${CHANGE_REQUEST_STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"`);
  };

  const handleConfirmResolution = async () => {
    if (!selectedRequest || !pendingStatus) return;
    
    await onUpdateStatus(selectedRequest.id, pendingStatus, resolutionNote || undefined);
    toast.success('Solicitação concluída');
    setShowResolutionDialog(false);
    setSelectedRequest(null);
    setPendingStatus(null);
  };

  const getStatusBadge = (status: ChangeRequestStatus) => {
    const option = CHANGE_REQUEST_STATUS_OPTIONS.find(s => s.value === status);
    const colors: Record<ChangeRequestStatus, string> = {
      open: 'bg-warning/10 text-warning',
      in_progress: 'bg-primary/10 text-primary',
      done: 'bg-success/10 text-success',
      canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return (
      <Badge variant="outline" className={colors[status]}>
        {option?.label || status}
      </Badge>
    );
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const openCount = requests.filter(r => r.status === 'open' || r.status === 'in_progress').length;

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="flex items-center gap-1">
              Solicitações
              {openCount > 0 && (
                <Badge variant="attention" className="ml-1 h-5 px-1.5 text-xs">
                  {openCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Nova Solicitação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <CheckCircle className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma solicitação de alteração
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const requester = request.requested_by_member_id 
                    ? getMemberById(request.requested_by_member_id)
                    : null;
                  const resolver = request.resolved_by_member_id
                    ? getMemberById(request.resolved_by_member_id)
                    : null;

                  return (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(request.status)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {requester && (
                              <span className="text-xs text-muted-foreground">
                                por {requester.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {stripHtml(request.comment_rich)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedRequest(request)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Quick action buttons */}
                      {(request.status === 'open' || request.status === 'in_progress') && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {request.status === 'open' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(request, 'in_progress')}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Iniciar
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(request, 'done')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Concluir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(request, 'canceled')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      )}

                      {/* Resolution info */}
                      {request.status === 'done' && request.resolved_at && (
                        <div className="pt-2 border-t text-xs text-muted-foreground">
                          <span>Resolvida em {format(new Date(request.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          {resolver && <span> por {resolver.name}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-2">
              <Label>O que deve ser alterado?</Label>
              <RichTextEditor
                content={newComment}
                onChange={setNewComment}
                placeholder="Descreva detalhadamente o que precisa ser alterado..."
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmitRequest} disabled={submitting}>
                {submitting ? (
                  <Skeleton className="h-4 w-16 rounded" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Solicitar Alteração
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!selectedRequest && !showResolutionDialog} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Solicitação de Alteração
                {selectedRequest && getStatusBadge(selectedRequest.status)}
              </DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Solicitada em {format(new Date(selectedRequest.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {selectedRequest.requested_by_member_id && getMemberById(selectedRequest.requested_by_member_id) && (
                    <span> por {getMemberById(selectedRequest.requested_by_member_id)?.name}</span>
                  )}
                </div>
                
                <div className="border rounded-lg bg-muted/30">
                  <RichTextViewer content={selectedRequest.comment_rich} />
                </div>

                {selectedRequest.status === 'done' && selectedRequest.resolution_note_rich && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nota de resolução:</Label>
                    <div className="border rounded-lg bg-muted/50">
                      <RichTextViewer content={selectedRequest.resolution_note_rich} />
                    </div>
                  </div>
                )}

                {(selectedRequest.status === 'open' || selectedRequest.status === 'in_progress') && (
                  <div className="flex items-center gap-2 pt-4 border-t">
                    {selectedRequest.status === 'open' && (
                      <Button
                        variant="outline"
                        onClick={() => handleStatusChange(selectedRequest, 'in_progress')}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Marcar em andamento
                      </Button>
                    )}
                    <Button onClick={() => handleStatusChange(selectedRequest, 'done')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluir
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleStatusChange(selectedRequest, 'canceled')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <div className="flex-1" />
                    <ConfirmDeleteDialog
                      itemName="esta solicitação"
                      onConfirm={async () => {
                        await onDelete(selectedRequest.id);
                        setSelectedRequest(null);
                        toast.success('Solicitação excluída');
                      }}
                    >
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmDeleteDialog>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Resolution Note Dialog */}
        <Dialog open={showResolutionDialog} onOpenChange={setShowResolutionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Concluir solicitação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nota de resolução (opcional)</Label>
                <Textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Descreva o que foi feito para resolver..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResolutionDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmResolution}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
