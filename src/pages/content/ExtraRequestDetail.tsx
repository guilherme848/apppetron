import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, Trash2, FileIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SaveStatus } from '@/components/ui/save-status';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave, useAutoSaveNavigation } from '@/hooks/useAutoSave';
import { useExtraRequests, useExtraRequestFiles } from '@/hooks/useExtraRequests';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  EXTRA_REQUEST_STATUS_LABELS,
  EXTRA_REQUEST_PRIORITY_LABELS,
  EXTRA_REQUESTED_BY_ROLE_LABELS,
  EXTRA_RESPONSIBLE_ROLE_LABELS,
  ExtraRequestStatus,
  ExtraRequestPriority,
  ExtraResponsibleRole,
  ROLE_KEY_TO_ACCOUNT_FIELD,
} from '@/types/extraRequests';
import { FORMAT_OPTIONS } from '@/types/contentProduction';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ExtraRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requests, updateRequest, deleteRequest, loading: requestsLoading } = useExtraRequests();
  const { files, uploadFile, deleteFile, loading: filesLoading } = useExtraRequestFiles(id || null);
  const { accounts } = useCrmData();
  const [deleting, setDeleting] = useState(false);
  const { members } = useTeamMembers();

  const request = requests.find(r => r.id === id);

  // Local state for form
  const [title, setTitle] = useState('');
  const [formatValue, setFormatValue] = useState('');
  const [requestRich, setRequestRich] = useState('');
  const [status, setStatus] = useState<ExtraRequestStatus>('open');
  const [priority, setPriority] = useState<ExtraRequestPriority>('medium');
  const [responsibleRoleKey, setResponsibleRoleKey] = useState<ExtraResponsibleRole | ''>('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [uploading, setUploading] = useState(false);

  // Populate form when request loads
  useEffect(() => {
    if (request) {
      setTitle(request.title);
      setFormatValue(request.format || '');
      setRequestRich(request.request_rich || '');
      setStatus(request.status);
      setPriority(request.priority);
      setResponsibleRoleKey(request.responsible_role_key || '');
      setAssigneeId(request.assignee_id || '');
      setDueDate(request.due_date || '');
    }
  }, [request]);

  // Auto-save setup
  const handleSave = useCallback(async (data: Record<string, any>) => {
    if (!id) return;
    await updateRequest(id, data);
  }, [id, updateRequest]);

  const { status: saveStatus, saveNow, queueChange, flush, hasPendingChanges } = useAutoSave({
    onSave: handleSave,
  });

  useAutoSaveNavigation(flush, hasPendingChanges);

  // Auto-assign when responsible_role_key changes
  useEffect(() => {
    if (responsibleRoleKey && request?.client_id) {
      const account = accounts.find(a => a.id === request.client_id);
      if (account) {
        const field = ROLE_KEY_TO_ACCOUNT_FIELD[responsibleRoleKey];
        const memberId = (account as any)[field];
        if (memberId && memberId !== assigneeId) {
          setAssigneeId(memberId);
        }
      }
    }
  }, [responsibleRoleKey, request?.client_id, accounts, assigneeId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    for (const file of Array.from(fileList)) {
      const result = await uploadFile(file);
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    const result = await deleteFile(fileId, storagePath);
    if (!result.success) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const handleDeleteRequest = async () => {
    if (!id) return;
    setDeleting(true);
    
    // Delete associated files from storage first
    if (files.length > 0) {
      const paths = files.map(f => f.storage_path);
      await supabase.storage.from('content-production').remove(paths);
    }
    
    const result = await deleteRequest(id);
    if (result.success) {
      toast({ title: 'Solicitação extra apagada', description: 'A solicitação foi excluída com sucesso.' });
      navigate('/content/extra-requests');
    } else {
      toast({ title: 'Erro', description: result.error || 'Não foi possível apagar', variant: 'destructive' });
      setDeleting(false);
    }
  };

  if (requestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Solicitação não encontrada</p>
        <Link to="/content/extra-requests" className="text-primary hover:underline mt-2 inline-block">
          Voltar à lista
        </Link>
      </div>
    );
  }

  const activeMembers = members.filter(m => m.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/content/extra-requests')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{request.client_name}</h1>
            <p className="text-muted-foreground">Solicitação Extra • {request.month_ref}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus status={saveStatus} />
          <ConfirmDeleteDialog
            itemName={request.title}
            description="Tem certeza que deseja apagar esta solicitação extra? Esta ação não poderá ser desfeita."
            warning={files.length > 0 ? `Esta solicitação possui ${files.length} anexo(s) que também serão excluídos.` : undefined}
            onConfirm={handleDeleteRequest}
          >
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </ConfirmDeleteDialog>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="files">Anexos ({files.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informações da Solicitação</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {EXTRA_REQUESTED_BY_ROLE_LABELS[request.requested_by_role_key]}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Criado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {request.requested_by_member_name && ` por ${request.requested_by_member_name}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); queueChange({ title: e.target.value }); }}
                    onBlur={flush}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={formatValue || '_none_'} onValueChange={(v) => { const val = v === '_none_' ? '' : v; setFormatValue(val); saveNow({ format: val || null }); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Nenhum</SelectItem>
                      {FORMAT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => { setStatus(v as ExtraRequestStatus); saveNow({ status: v }); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXTRA_REQUEST_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pedido / Descrição</Label>
                <RichTextEditor
                  content={requestRich}
                  onChange={(v) => { setRequestRich(v); queueChange({ request_rich: v }); }}
                  onBlur={flush}
                  placeholder="Descreva a solicitação..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cargo Responsável</Label>
                  <Select value={responsibleRoleKey || '_none_'} onValueChange={(v) => { const val = v === '_none_' ? '' : v; setResponsibleRoleKey(val as ExtraResponsibleRole | ''); saveNow({ responsible_role_key: val || null }); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Nenhum</SelectItem>
                      {Object.entries(EXTRA_RESPONSIBLE_ROLE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              <div className="space-y-2">
                <Label>Responsável (atribuição automática)</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50 min-h-[40px]">
                  <span className="text-sm">
                    {assigneeId 
                      ? activeMembers.find(m => m.id === assigneeId)?.name || 'Membro não encontrado'
                      : 'Não definido no Time da Conta'
                    }
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  O responsável é atribuído automaticamente pelo Time da Conta do cliente.
                </p>
              </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Prazo</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => { setDueDate(e.target.value); saveNow({ due_date: e.target.value || null }); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={(v) => { setPriority(v as ExtraRequestPriority); saveNow({ priority: v }); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXTRA_REQUEST_PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {request.completed_at && (
                <p className="text-sm text-muted-foreground">
                  Concluído em {format(new Date(request.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Anexos</CardTitle>
              <CardDescription>Arquivos relacionados a esta solicitação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Clique para enviar arquivos</p>
                      </>
                    )}
                  </div>
                </Label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>

              {files.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Nenhum anexo</p>
              ) : (
                <div className="space-y-2">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {file.public_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={file.public_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(file.id, file.storage_path)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
