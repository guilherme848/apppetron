import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2, Upload, FileIcon, Download, Plus, X, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SaveStatus } from '@/components/ui/save-status';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCreativeRequestDetail } from '@/hooks/useCreativeRequests';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCurrentMember } from '@/hooks/usePermissions';
import { useAutoSave } from '@/hooks/useAutoSave';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { getRequestStatusVariant } from '@/lib/badgeMaps';
import {
  CREATIVE_REQUEST_STATUS_OPTIONS,
  CREATIVE_REQUEST_STATUS_LABELS,
  CREATIVE_REQUEST_PRIORITY_OPTIONS,
  CREATIVE_REQUEST_FORMAT_OPTIONS,
  CREATIVE_REQUEST_OBJECTIVE_OPTIONS,
  CREATIVE_RESPONSIBLE_ROLE_OPTIONS,
  CREATIVE_STATUS_TRANSITIONS,
  CreativeRequestStatus,
  CreativeRequestPriority,
  CreativeRequestFormat,
  CreativeRequestObjective,
  CreativeResponsibleRole,
} from '@/types/creativeRequests';
import { format } from 'date-fns';

export default function CreativeRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    request, files, items, itemFiles, statusHistory, loading,
    updateField, changeStatus,
    uploadFile, deleteFile,
    addItem, updateItem, deleteItem,
    uploadItemFile, deleteItemFile,
    refetch,
  } = useCreativeRequestDetail(id);
  const { members, getActiveMembers } = useTeamMembers();
  const { currentMemberId } = useCurrentMember();

  const [title, setTitle] = useState('');
  const [briefTitle, setBriefTitle] = useState('');
  const [briefRich, setBriefRich] = useState('');
  const [status, setStatus] = useState<CreativeRequestStatus>('open');
  const [priority, setPriority] = useState<CreativeRequestPriority>('medium');
  const [format_, setFormat] = useState<CreativeRequestFormat>('static');
  const [objective, setObjective] = useState<CreativeRequestObjective | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [responsibleRoleKey, setResponsibleRoleKey] = useState<CreativeResponsibleRole | ''>('');
  const [assigneeId, setAssigneeId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [uploading, setUploading] = useState(false);

  // Rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');

  // New item form
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemFormat, setNewItemFormat] = useState<CreativeRequestFormat>('static');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setTitle(request.title || '');
      setBriefTitle(request.brief_title || '');
      setBriefRich(request.brief_rich || '');
      setStatus(request.status);
      setPriority(request.priority);
      setFormat(request.format);
      setObjective(request.objective || '');
      setDueDate(request.due_date || '');
      setResponsibleRoleKey(request.responsible_role_key || '');
      setAssigneeId(request.assignee_id || '');
      setReviewerId(request.reviewer_member_id || '');
    }
  }, [request]);

  const handleSave = useCallback(
    async (data: Record<string, any>) => {
      const result = await updateField(data);
      if (!result.success) {
        toast({ title: 'Erro ao salvar', description: result.error, variant: 'destructive' });
      }
    },
    [updateField, toast]
  );

  const { status: saveStatus, saveNow, queueChange, flush } = useAutoSave({ onSave: handleSave });

  const handleTitleChange = (value: string) => { setTitle(value); queueChange({ title: value }); };
  const handleBriefTitleChange = (value: string) => { setBriefTitle(value); queueChange({ brief_title: value || null }); };
  const handleBriefRichChange = (value: string) => { setBriefRich(value); queueChange({ brief_rich: value || null }); };
  const handleDueDateChange = (value: string) => { setDueDate(value); saveNow({ due_date: value || null }); };

  const handlePriorityChange = async (value: CreativeRequestPriority) => {
    setPriority(value); await flush(); updateField({ priority: value });
  };
  const handleFormatChange = async (value: CreativeRequestFormat) => {
    setFormat(value); await flush(); updateField({ format: value });
  };
  const handleObjectiveChange = async (value: string) => {
    const val = value === 'none' ? null : (value as CreativeRequestObjective);
    setObjective(val || ''); await flush(); updateField({ objective: val });
  };
  const handleRoleKeyChange = async (value: string) => {
    const val = value as CreativeResponsibleRole;
    setResponsibleRoleKey(val); await flush(); updateField({ responsible_role_key: val });
  };
  const handleReviewerChange = async (value: string) => {
    const val = value === 'none' ? null : value;
    setReviewerId(val || ''); await flush(); updateField({ reviewer_member_id: val });
  };

  // Approval workflow actions
  const handleStatusTransition = async (newStatus: CreativeRequestStatus) => {
    if (newStatus === 'rejected') {
      setRejectDialogOpen(true);
      return;
    }
    const result = await changeStatus(newStatus, currentMemberId || null);
    if (result.success) {
      toast({ title: `Status alterado para "${CREATIVE_REQUEST_STATUS_LABELS[newStatus]}"` });
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!rejectionFeedback.trim()) {
      toast({ title: 'Erro', description: 'O feedback é obrigatório para reprovar', variant: 'destructive' });
      return;
    }
    const result = await changeStatus('rejected', currentMemberId || null, rejectionFeedback.trim());
    if (result.success) {
      toast({ title: 'Solicitação reprovada e devolvida para produção' });
      setRejectDialogOpen(false);
      setRejectionFeedback('');
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  // File handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFile(file);
    setUploading(false);
    if (result.success) toast({ title: 'Arquivo enviado' });
    else toast({ title: 'Erro ao enviar', description: result.error, variant: 'destructive' });
    e.target.value = '';
  };

  const handleFileDelete = async (fileId: string, storagePath: string) => {
    const result = await deleteFile(fileId, storagePath);
    if (result.success) toast({ title: 'Arquivo removido' });
    else toast({ title: 'Erro ao remover', description: result.error, variant: 'destructive' });
  };

  // Item handling
  const handleAddItem = async () => {
    if (!newItemTitle.trim()) {
      toast({ title: 'Informe o título do criativo', variant: 'destructive' });
      return;
    }
    setAddingItem(true);
    const result = await addItem(newItemTitle.trim(), newItemFormat, newItemNotes.trim() || undefined);
    setAddingItem(false);
    if (result.success) {
      setNewItemTitle('');
      setNewItemFormat('static');
      setNewItemNotes('');
      toast({ title: 'Criativo adicionado' });
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const result = await deleteItem(itemId);
    if (result.success) toast({ title: 'Criativo removido' });
    else toast({ title: 'Erro', description: result.error, variant: 'destructive' });
  };

  const handleItemFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingItemId(itemId);
    const result = await uploadItemFile(itemId, file);
    setUploadingItemId(null);
    if (result.success) toast({ title: 'Arquivo enviado' });
    else toast({ title: 'Erro ao enviar', description: result.error, variant: 'destructive' });
    e.target.value = '';
  };

  const handleItemFileDelete = async (fileId: string, storagePath: string) => {
    const result = await deleteItemFile(fileId, storagePath);
    if (result.success) toast({ title: 'Arquivo removido' });
    else toast({ title: 'Erro', description: result.error, variant: 'destructive' });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/traffic/creative-requests')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <p className="text-center text-muted-foreground">Solicitação não encontrada</p>
      </div>
    );
  }

  const activeMembers = getActiveMembers();
  const allowedTransitions = CREATIVE_STATUS_TRANSITIONS[request.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/traffic/creative-requests')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{request.client_name}</h1>
            <p className="text-muted-foreground">{title || 'Sem título'}</p>
          </div>
        </div>
        <SaveStatus status={saveStatus} />
      </div>

      {/* Status bar with workflow actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Status:</Label>
              <Badge variant={getRequestStatusVariant(request.status)} className="text-sm px-3 py-1">
                {CREATIVE_REQUEST_STATUS_LABELS[request.status]}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((nextStatus) => {
                const isReject = nextStatus === 'rejected';
                return (
                  <Button
                    key={nextStatus}
                    size="sm"
                    variant={isReject ? 'destructive' : nextStatus === 'approved' || nextStatus === 'done' ? 'default' : 'outline'}
                    onClick={() => handleStatusTransition(nextStatus)}
                  >
                    {nextStatus === 'in_progress' && <ArrowRight className="h-3 w-3 mr-1" />}
                    {nextStatus === 'ready_for_review' && <Clock className="h-3 w-3 mr-1" />}
                    {nextStatus === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {nextStatus === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                    {CREATIVE_REQUEST_STATUS_LABELS[nextStatus]}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Show last rejection feedback */}
          {request.rejection_feedback && request.status === 'in_progress' && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">Feedback da última reprovação:</p>
              <p className="text-sm mt-1">{request.rejection_feedback}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header row */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={handlePriorityChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREATIVE_REQUEST_PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={format_} onValueChange={handleFormatChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREATIVE_REQUEST_FORMAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input
                value={activeMembers.find((m) => m.id === assigneeId)?.name || 'Definido pelo cargo'}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={dueDate} onChange={(e) => handleDueDateChange(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Dados da Solicitação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} onBlur={flush} placeholder="Título da solicitação" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Select value={objective || 'none'} onValueChange={handleObjectiveChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {CREATIVE_REQUEST_OBJECTIVE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cargo Responsável *</Label>
                  <Select value={responsibleRoleKey || ''} onValueChange={handleRoleKeyChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                    <SelectContent>
                      {CREATIVE_RESPONSIBLE_ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Revisor</Label>
                <Select value={reviewerId || 'none'} onValueChange={handleReviewerChange}>
                  <SelectTrigger className="w-full md:w-1/2"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {activeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Briefing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título do Briefing</Label>
                <Input value={briefTitle} onChange={(e) => handleBriefTitleChange(e.target.value)} onBlur={flush} placeholder="Resumo ou título do briefing" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <RichTextEditor content={briefRich} onChange={handleBriefRichChange} onBlur={flush} placeholder="Descreva o criativo desejado..." />
              </div>
            </CardContent>
          </Card>

          {/* Creatives Section */}
          <Card>
            <CardHeader>
              <CardTitle>Criativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum criativo adicionado ainda.</p>
              )}

              {items.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.title}</span>
                      <Badge variant="outline">{item.format === 'video' ? 'Vídeo' : 'Estático'}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {item.notes && (
                    <p className="text-sm text-muted-foreground">{item.notes}</p>
                  )}

                  {/* Item files */}
                  <div className="space-y-2">
                    {(itemFiles[item.id] || []).map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {file.public_url && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(file.public_url!, '_blank')}>
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleItemFileDelete(file.id, file.storage_path)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" onChange={(e) => handleItemFileUpload(item.id, e)} disabled={uploadingItemId === item.id} />
                      <Button variant="outline" size="sm" asChild disabled={uploadingItemId === item.id}>
                        <span>
                          {uploadingItemId === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                          Anexar arquivo
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              ))}

              {/* Add new item form */}
              <div className="border rounded-lg p-4 space-y-3 border-dashed">
                <p className="text-sm font-medium">Adicionar Criativo</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input placeholder="Título do criativo *" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} />
                  <Select value={newItemFormat} onValueChange={(v) => setNewItemFormat(v as CreativeRequestFormat)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CREATIVE_REQUEST_FORMAT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Observação (opcional)" value={newItemNotes} onChange={(e) => setNewItemNotes(e.target.value)} />
                </div>
                <Button size="sm" onClick={handleAddItem} disabled={addingItem || !newItemTitle.trim()}>
                  {addingItem ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Adicionar Criativo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Anexos Gerais
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</span>
                  </Button>
                </label>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum anexo</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {file.public_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(file.public_url!, '_blank')}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleFileDelete(file.id, file.storage_path)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <Card>
            <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mês</span>
                <span>{request.month_ref}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              {request.completed_at && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Concluído em</span>
                    <span>{format(new Date(request.completed_at), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solicitante</span>
                <span>{request.requested_by_member_name || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader><CardTitle>Histórico de Status</CardTitle></CardHeader>
            <CardContent>
              {statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico</p>
              ) : (
                <div className="space-y-3">
                  {statusHistory.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-1 p-2 rounded-md bg-muted/50 border">
                      <div className="flex items-center gap-1 text-xs">
                        {entry.from_status && (
                          <>
                            <Badge variant={getRequestStatusVariant(entry.from_status)} className="text-[10px] px-1.5 py-0">
                              {CREATIVE_REQUEST_STATUS_LABELS[entry.from_status as CreativeRequestStatus] || entry.from_status}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </>
                        )}
                        <Badge variant={getRequestStatusVariant(entry.to_status)} className="text-[10px] px-1.5 py-0">
                          {CREATIVE_REQUEST_STATUS_LABELS[entry.to_status as CreativeRequestStatus] || entry.to_status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{entry.changed_by_name || 'Sistema'}</span>
                        <span>{format(new Date(entry.created_at), 'dd/MM HH:mm')}</span>
                      </div>
                      {entry.feedback && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{entry.feedback}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o feedback para o responsável. A solicitação voltará automaticamente para "Em Produção".
            </p>
            <div className="space-y-2">
              <Label>Feedback *</Label>
              <Textarea
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                placeholder="Descreva o que precisa ser ajustado..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectionFeedback(''); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionFeedback.trim()}>
              Reprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
