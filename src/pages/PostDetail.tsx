import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useContentProduction } from '@/contexts/ContentProductionContext';
import { FileUpload } from '@/components/content/FileUpload';
import { CHANNEL_OPTIONS, FORMAT_OPTIONS, POST_STATUS_OPTIONS, PostStatus, PostAttachment } from '@/types/contentProduction';
import { RESPONSIBLE_ROLE_OPTIONS, ResponsibleRoleKey } from '@/types/crm';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Badge } from '@/components/ui/badge';
import { format as formatDate } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PostDetail() {
  const { batchId, postId } = useParams<{ batchId: string; postId: string }>();
  const navigate = useNavigate();
  const { batches, posts, accounts, loading, updatePost, deletePost, fetchPosts } = useContentProduction();
  const { getActiveMembers, getMemberById } = useTeamMembers();

  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState<PostStatus>('todo');
  const [briefing, setBriefing] = useState('');
  const [caption, setCaption] = useState('');
  
  const [responsibleRoleKey, setResponsibleRoleKey] = useState<ResponsibleRoleKey>('social');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [showTeamWarning, setShowTeamWarning] = useState(false);

  const batch = batches.find((b) => b.id === batchId);
  const post = posts.find((p) => p.id === postId);
  const client = batch ? accounts.find((a) => a.id === batch.client_id) : null;

  const fetchAttachments = useCallback(async () => {
    if (!postId) return;
    setLoadingAttachments(true);
    const { data, error } = await supabase
      .from('post_attachments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching attachments:', error);
    } else {
      setAttachments(data || []);
    }
    setLoadingAttachments(false);
  }, [postId]);

  useEffect(() => {
    if (batchId) {
      fetchPosts(batchId);
    }
  }, [batchId, fetchPosts]);

  useEffect(() => {
    if (postId) {
      fetchAttachments();
    }
  }, [postId, fetchAttachments]);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setChannel(post.channel || '');
      setFormat(post.format || '');
      setStatus(post.status);
      setBriefing(post.briefing || '');
      setCaption(post.caption || '');
      
      // Use responsible_role_key from database, fallback to 'social'
      const roleKey = (post as any).responsible_role_key as ResponsibleRoleKey || 'social';
      setResponsibleRoleKey(roleKey);
      setAssigneeId(post.assignee_id || '');
    }
  }, [post]);

  // Auto-assign based on role when post loads without assignee or when role changes
  const getAssigneeFromRole = useCallback((roleKey: ResponsibleRoleKey): string | null => {
    if (!client) return null;
    const roleOption = RESPONSIBLE_ROLE_OPTIONS.find(o => o.value === roleKey);
    if (!roleOption) return null;
    const memberId = (client as any)[roleOption.field] as string | null;
    return memberId || null;
  }, [client]);

  // Auto-assign when role changes
  const handleRoleChange = (newRoleKey: ResponsibleRoleKey) => {
    setResponsibleRoleKey(newRoleKey);
    const autoAssignee = getAssigneeFromRole(newRoleKey);
    if (autoAssignee) {
      setAssigneeId(autoAssignee);
      setShowTeamWarning(false);
    } else {
      setShowTeamWarning(true);
    }
  };

  // Re-apply auto-assignment
  const handleReapplyAssignment = () => {
    const autoAssignee = getAssigneeFromRole(responsibleRoleKey);
    if (autoAssignee) {
      setAssigneeId(autoAssignee);
      setShowTeamWarning(false);
      toast.success('Responsável atribuído automaticamente');
    } else {
      setShowTeamWarning(true);
      toast.warning('Configure o Time da Conta para este cargo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!batch || !post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Post não encontrado</h2>
        <Button variant="outline" onClick={() => navigate(`/content/production/${batchId}`)}>
          Voltar ao Pacote
        </Button>
      </div>
    );
  }

  const clientName = accounts.find((a) => a.id === batch.client_id)?.name || 'Cliente desconhecido';
  const formatMonthRef = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setSaving(true);
    
    await updatePost(post.id, {
      title: title.trim(),
      channel: channel || null,
      format: format || null,
      status,
      briefing: briefing || null,
      caption: caption || null,
      
      responsible_role_key: responsibleRoleKey,
      assignee_id: assigneeId || null,
    } as any); // Using any because responsible_role_key is new
    setSaving(false);
    toast.success('Post salvo com sucesso');
  };

  const VIDEO_FORMATS = ['reels', 'shorts', 'video'];
  const DESIGN_FORMATS = ['carrossel', 'post', 'story'];

  const handleFormatChange = (value: string) => {
    const newFormat = value === '_none_' ? '' : value;
    setFormat(newFormat);
  };


  const handleDelete = async () => {
    await deletePost(post.id);
    toast.success('Post excluído');
    navigate(`/content/production/${batchId}`);
  };

  const handleFileUploaded = async (file: { file_name: string; file_path: string; file_size: number; file_type: string }) => {
    const { data, error } = await supabase
      .from('post_attachments')
      .insert([{ post_id: postId, ...file }])
      .select()
      .single();
    if (error) {
      console.error('Error saving attachment:', error);
      return;
    }
    setAttachments((prev) => [data, ...prev]);
  };

  const handleFileDeleted = async (fileId: string) => {
    await supabase.from('post_attachments').delete().eq('id', fileId);
    setAttachments((prev) => prev.filter((a) => a.id !== fileId));
  };

  const captionLength = caption.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/content/production/${batchId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{title || 'Novo Post'}</h1>
          <p className="text-sm text-muted-foreground">
            {clientName} • {formatMonthRef(batch.month_ref)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir post?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="post" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="post">Post</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          <TabsTrigger value="caption">Legenda</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
        </TabsList>

        <TabsContent value="post">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Read-only info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-md">
                <div>
                  <span className="text-xs text-muted-foreground">Cliente</span>
                  <p className="font-medium">{clientName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Vencimento do Planejamento</span>
                  <p className="font-medium">
                    {batch.planning_due_date 
                      ? formatDate(new Date(batch.planning_due_date), 'dd/MM/yyyy')
                      : 'Não definido'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Título do Post *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reels - Depoimento Cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select value={channel || '_none_'} onValueChange={(v) => setChannel(v === '_none_' ? '' : v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="_none_">Nenhum</SelectItem>
                      {CHANNEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={format || '_none_'} onValueChange={handleFormatChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="_none_">Nenhum</SelectItem>
                      {FORMAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {POST_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cargo Responsável</Label>
                <Select value={responsibleRoleKey} onValueChange={(v) => handleRoleChange(v as ResponsibleRoleKey)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {RESPONSIBLE_ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {showTeamWarning && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">
                    ⚠️ O cargo "{RESPONSIBLE_ROLE_OPTIONS.find(o => o.value === responsibleRoleKey)?.label}" não está configurado no Time da Conta deste cliente.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Responsável (Usuário)</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleReapplyAssignment}
                    className="h-6 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reaplicar pelo cargo
                  </Button>
                </div>
                <Select value={assigneeId || '_none_'} onValueChange={(v) => setAssigneeId(v === '_none_' ? '' : v)}>
                  <SelectTrigger className={`bg-background ${!assigneeId ? 'border-warning' : ''}`}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="_none_">Sem responsável</SelectItem>
                    {getActiveMembers().map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!assigneeId && (
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Post sem usuário responsável
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="briefing">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="briefing">Briefing</Label>
                <Textarea
                  id="briefing"
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  placeholder="Descreva o briefing do post: objetivo, referências, tom de voz, etc."
                  rows={12}
                  className="resize-y"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caption">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="caption">Legenda</Label>
                  <span className="text-xs text-muted-foreground">
                    {captionLength} caracteres
                  </span>
                </div>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Escreva a legenda do post..."
                  rows={12}
                  className="resize-y"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arquivos do Post</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAttachments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <FileUpload
                  files={attachments}
                  folder={`posts/${postId}`}
                  onFileUploaded={handleFileUploaded}
                  onFileDeleted={handleFileDeleted}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
