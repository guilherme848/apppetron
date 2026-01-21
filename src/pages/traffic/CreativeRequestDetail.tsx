import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2, Upload, FileIcon, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SaveStatus } from '@/components/ui/save-status';
import { useToast } from '@/hooks/use-toast';
import { useCreativeRequestDetail } from '@/hooks/useCreativeRequests';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAutoSave } from '@/hooks/useAutoSave';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import {
  CREATIVE_REQUEST_STATUS_OPTIONS,
  CREATIVE_REQUEST_PRIORITY_OPTIONS,
  CREATIVE_REQUEST_FORMAT_OPTIONS,
  CREATIVE_REQUEST_OBJECTIVE_OPTIONS,
  CREATIVE_RESPONSIBLE_ROLE_OPTIONS,
  CREATIVE_REQUEST_FORMAT_LABELS,
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
  const { request, files, loading, updateField, uploadFile, deleteFile, refetch } = useCreativeRequestDetail(id);
  const { members, getActiveMembers } = useTeamMembers();

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

  // Initialize form values
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

  // Autosave handler
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

  // Commit-based text fields: queue on change, flush on blur
  const handleTitleChange = (value: string) => {
    setTitle(value);
    queueChange({ title: value });
  };

  const handleBriefTitleChange = (value: string) => {
    setBriefTitle(value);
    queueChange({ brief_title: value || null });
  };

  const handleBriefRichChange = (value: string) => {
    setBriefRich(value);
    queueChange({ brief_rich: value || null });
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value);
    // Date pickers save immediately
    saveNow({ due_date: value || null });
  };

  // Instant save fields
  const handleStatusChange = async (value: CreativeRequestStatus) => {
    setStatus(value);
    await flush();
    updateField({ status: value });
  };

  const handlePriorityChange = async (value: CreativeRequestPriority) => {
    setPriority(value);
    await flush();
    updateField({ priority: value });
  };

  const handleFormatChange = async (value: CreativeRequestFormat) => {
    setFormat(value);
    await flush();
    updateField({ format: value });
  };

  const handleObjectiveChange = async (value: string) => {
    const val = value === 'none' ? null : (value as CreativeRequestObjective);
    setObjective(val || '');
    await flush();
    updateField({ objective: val });
  };

  const handleRoleKeyChange = async (value: string) => {
    const val = value as CreativeResponsibleRole;
    setResponsibleRoleKey(val);
    await flush();
    // The database trigger will automatically resolve the assignee based on the role
    updateField({ responsible_role_key: val });
  };

  // Assignee is now read-only - automatically set by account team based on role
  // Removed handleAssigneeChange - assignment comes from database trigger

  const handleReviewerChange = async (value: string) => {
    const val = value === 'none' ? null : value;
    setReviewerId(val || '');
    await flush();
    updateField({ reviewer_member_id: val });
  };

  // File handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const result = await uploadFile(file);
    setUploading(false);

    if (result.success) {
      toast({ title: 'Arquivo enviado' });
    } else {
      toast({ title: 'Erro ao enviar', description: result.error, variant: 'destructive' });
    }
    e.target.value = '';
  };

  const handleFileDelete = async (fileId: string, storagePath: string) => {
    const result = await deleteFile(fileId, storagePath);
    if (result.success) {
      toast({ title: 'Arquivo removido' });
    } else {
      toast({ title: 'Erro ao remover', description: result.error, variant: 'destructive' });
    }
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
        <Button variant="ghost" onClick={() => navigate('/traffic/creatives')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <p className="text-center text-muted-foreground">Solicitação não encontrada</p>
      </div>
    );
  }

  const activeMembers = getActiveMembers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/traffic/creatives')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{request.client_name}</h1>
            <p className="text-muted-foreground">{title || 'Sem título'}</p>
          </div>
        </div>
        <SaveStatus status={saveStatus} />
      </div>

      {/* Header row */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREATIVE_REQUEST_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={handlePriorityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <p className="text-xs text-muted-foreground">
                Atribuído automaticamente pelo Time da Conta
              </p>
            </div>

            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={flush}
                  placeholder="Título da solicitação"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <Select value={objective || 'none'} onValueChange={handleObjectiveChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATIVE_RESPONSIBLE_ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define quem será o responsável pela tarefa
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Revisor</Label>
                <Select value={reviewerId || 'none'} onValueChange={handleReviewerChange}>
                  <SelectTrigger className="w-full md:w-1/2">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
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
            <CardHeader>
              <CardTitle>Briefing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título do Briefing</Label>
                <Input
                  value={briefTitle}
                  onChange={(e) => handleBriefTitleChange(e.target.value)}
                  onBlur={flush}
                  placeholder="Resumo ou título do briefing"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <RichTextEditor
                  content={briefRich}
                  onChange={handleBriefRichChange}
                  onBlur={flush}
                  placeholder="Descreva o criativo desejado..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Anexos
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </span>
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
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {file.public_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(file.public_url!, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleFileDelete(file.id, file.storage_path)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
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
        </div>
      </div>
    </div>
  );
}
