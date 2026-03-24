import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, FileText, Paperclip, AlertTriangle, Archive, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useContentProduction } from '@/contexts/ContentProductionContext';
import { FileUpload } from '@/components/content/FileUpload';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { MultiFileUpload } from '@/components/content/MultiFileUpload';
import { ChangeRequestsTab } from '@/components/content/ChangeRequestsTab';
import { SaveStatus } from '@/components/ui/save-status';
import { useAutoSave, useAutoSaveNavigation } from '@/hooks/useAutoSave';
import { CHANNEL_OPTIONS, FORMAT_OPTIONS, POST_STATUS_OPTIONS, PostStatus, PostAttachment, ContentPostFile } from '@/types/contentProduction';
import { RESPONSIBLE_ROLE_OPTIONS, ResponsibleRoleKey } from '@/types/crm';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useChangeRequests } from '@/hooks/useChangeRequests';
import { Badge } from '@/components/ui/badge';
import { format as formatDate } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRoleKeyFromFormat, isFormatAssignmentStage } from '@/lib/formatRoleMapping';
import { resolveAssigneeFromAccountTeam } from '@/lib/accountTeam';

export default function PostDetail() {
  const { batchId, postId } = useParams<{ batchId: string; postId: string }>();
  const navigate = useNavigate();
  const { batches, posts, accounts, loading, updatePost, deletePost, fetchPosts } = useContentProduction();
  const { getActiveMembers } = useTeamMembers();
  const { 
    requests: changeRequests, 
    loading: loadingChangeRequests, 
    fetchRequests: fetchChangeRequests,
    addRequest: addChangeRequest,
    updateRequestStatus,
    deleteRequest: deleteChangeRequest,
    openCount: openChangeRequestsCount,
    totalCount: totalChangeRequestsCount,
  } = useChangeRequests(postId);

  // Track initial data load to avoid triggering saves on mount
  const initialLoadComplete = useRef(false);

  // Keep UI tab stable even if the page re-renders (e.g. when browser tab focus changes)
  const TAB_STORAGE_KEY = postId ? `postDetailTab:${postId}` : null;
  type PostDetailTab = 'post' | 'briefing' | 'caption' | 'files' | 'changes';
  const [activeTab, setActiveTab] = useState<PostDetailTab>('post');

  // Basic post fields
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState<PostStatus>('todo');
  const [caption, setCaption] = useState('');
  
  // Briefing fields
  const [briefingTitle, setBriefingTitle] = useState('');
  const [briefingRich, setBriefingRich] = useState('');
  
  const [responsibleRoleKey, setResponsibleRoleKey] = useState<ResponsibleRoleKey>('social');
  const [assigneeId, setAssigneeId] = useState<string>('');
  
  // Legacy post_attachments
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  
  // New content_post_files (only for briefing now)
  const [briefingFiles, setBriefingFiles] = useState<ContentPostFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  const [showTeamWarning, setShowTeamWarning] = useState(false);

  const batch = batches.find((b) => b.id === batchId);
  const post = posts.find((p) => p.id === postId);
  const client = batch ? accounts.find((a) => a.id === batch.client_id) : null;

  const isVariableStage = batch ? isFormatAssignmentStage(batch.status) : false;

  // AutoSave setup - returns updated post so we can sync local state
  const handleSavePost = useCallback(async (data: Record<string, any>) => {
    if (!post) return;
    const updatedPost = await updatePost(post.id, data);
    
    // Sync local assignee state with the trigger-updated value from DB
    if (updatedPost && 'assignee_id' in data === false) {
      // Only sync if we didn't explicitly set assignee_id (trigger did it)
      if (updatedPost.assignee_id !== assigneeId) {
        setAssigneeId(updatedPost.assignee_id || '');
        setShowTeamWarning(!updatedPost.assignee_id);
      }
    }
  }, [post, updatePost, assigneeId]);

  const { status: saveStatus, saveNow, queueChange, flush, hasPendingChanges } = useAutoSave({
    onSave: handleSavePost,
    showToasts: false,
  });

  // Flush on navigation
  useAutoSaveNavigation(flush, hasPendingChanges);

  // Fetch legacy attachments
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

  // Fetch new content files
  const fetchContentFiles = useCallback(async () => {
    if (!postId) return;
    setLoadingFiles(true);
    const { data, error } = await supabase
      .from('content_post_files')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching content files:', error);
    } else {
      const files = (data || []) as ContentPostFile[];
      setBriefingFiles(files.filter(f => f.context === 'briefing'));
    }
    setLoadingFiles(false);
  }, [postId]);

  useEffect(() => {
    if (batchId) {
      fetchPosts(batchId);
    }
  }, [batchId, fetchPosts]);

  useEffect(() => {
    if (postId) {
      fetchAttachments();
      fetchContentFiles();
      fetchChangeRequests();
    }
  }, [postId, fetchAttachments, fetchContentFiles, fetchChangeRequests]);

  useEffect(() => {
    if (!TAB_STORAGE_KEY) return;
    const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (saved === 'post' || saved === 'briefing' || saved === 'caption' || saved === 'files' || saved === 'changes') {
      setActiveTab(saved);
    } else {
      setActiveTab('post');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TAB_STORAGE_KEY]);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      savedTitleRef.current = post.title || '';
      setChannel(post.channel || '');
      setFormat(post.format || '');
      setStatus(post.status);
      setCaption(post.caption || '');
      
      // Rich content fields
      setBriefingTitle((post as any).briefing_title || '');
      const richContent = (post as any).briefing_rich || '';
      const legacyBriefing = post.briefing || '';
      setBriefingRich(richContent || legacyBriefing);
      
      const roleKey = (post as any).responsible_role_key as ResponsibleRoleKey || 'social';
      setResponsibleRoleKey(roleKey);
      setAssigneeId(post.assignee_id || '');

      // Warning when no one is assigned (Account Team missing)
      setShowTeamWarning(!post.assignee_id);
      
      // Mark initial load complete after a short delay
      setTimeout(() => {
        initialLoadComplete.current = true;
      }, 100);
    }
  }, [post]);

  // Field change handlers with commit-based autosave
  // Text fields: only update local state on change, save on blur/Enter
  // Track draft title separately to detect actual changes
  const savedTitleRef = useRef(title);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Don't queue changes during typing - only on blur
  };

  const handleTitleBlur = async () => {
    if (initialLoadComplete.current && title.trim() !== savedTitleRef.current.trim()) {
      await saveNow({ title: title.trim() });
      savedTitleRef.current = title.trim();
    }
  };

  const handleTitleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (initialLoadComplete.current && title.trim() !== savedTitleRef.current.trim()) {
        await saveNow({ title: title.trim() });
        savedTitleRef.current = title.trim();
      }
      // Optionally blur to give visual feedback
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleChannelChange = (value: string) => {
    const newChannel = value === '_none_' ? '' : value;
    setChannel(newChannel);
    if (initialLoadComplete.current) {
      saveNow({ channel: newChannel || null });
    }
  };

  const handleFormatChange = (value: string) => {
    const newFormat = value === '_none_' ? '' : value;
    setFormat(newFormat);
    if (initialLoadComplete.current) {
      saveNow({ format: newFormat || null });
    }
  };

  const handleStatusChange = (newStatus: PostStatus) => {
    setStatus(newStatus);
    if (initialLoadComplete.current) {
      saveNow({ status: newStatus });
    }
  };

  const handleRoleChange = async (newRoleKey: ResponsibleRoleKey) => {
    setResponsibleRoleKey(newRoleKey);
    
    // IMMEDIATE UI update: resolve assignee locally from Account Team in memory
    if (client) {
      const localAssignee = resolveAssigneeFromAccountTeam(client as any, newRoleKey);
      setAssigneeId(localAssignee || '');
      setShowTeamWarning(!localAssignee);
    }
    
    // Save to backend (trigger will also set assignee_id, but we already updated UI)
    if (initialLoadComplete.current) {
      await saveNow({ responsible_role_key: newRoleKey });
    }
  };

  // Briefing handlers - commit-based (save on blur only)
  const handleBriefingTitleChange = (value: string) => {
    setBriefingTitle(value);
    // Don't queue changes during typing - only on blur
  };

  const handleBriefingTitleBlur = async () => {
    if (initialLoadComplete.current && post) {
      const currentValue = (post as any).briefing_title || '';
      if (briefingTitle !== currentValue) {
        await saveNow({ briefing_title: briefingTitle || null });
      }
    }
  };

  // Rich text: only update local state on change, save on blur
  const handleBriefingRichChange = (value: string) => {
    setBriefingRich(value);
  };

  const handleBriefingRichBlur = async () => {
    if (initialLoadComplete.current && post) {
      const currentValue = (post as any).briefing_rich || '';
      if (briefingRich !== currentValue) {
        await saveNow({ briefing_rich: briefingRich || null, briefing: briefingRich || null });
      }
    }
  };

  const handleCaptionChange = (value: string) => {
    setCaption(value);
  };

  const handleCaptionBlur = async () => {
    if (initialLoadComplete.current && post) {
      const currentValue = post.caption || '';
      if (caption !== currentValue) {
        await saveNow({ caption: caption || null });
      }
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

  const handleDelete = async () => {
    await deletePost(post.id);
    toast.success('Post excluído');
    navigate(`/content/production/${batchId}`);
  };

  // Legacy file handlers
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

  // Briefing file handlers
  const handleBriefingFileUploaded = async (file: {
    file_name: string;
    storage_path: string;
    file_size: number;
    file_type: string;
    public_url: string;
  }) => {
    const { data, error } = await supabase
      .from('content_post_files')
      .insert([{ 
        post_id: postId, 
        context: 'briefing',
        ...file 
      }])
      .select()
      .single();
    if (error) {
      console.error('Error saving briefing file:', error);
      return;
    }
    setBriefingFiles((prev) => [data as ContentPostFile, ...prev]);
  };

  const handleBriefingFileDeleted = async (fileId: string) => {
    await supabase.from('content_post_files').delete().eq('id', fileId);
    setBriefingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Change request handlers
  const handleAddChangeRequest = async (commentRich: string) => {
    return addChangeRequest(commentRich);
  };

  const handleUpdateChangeRequestStatus = async (id: string, newStatus: 'open' | 'in_progress' | 'done' | 'canceled', resolutionNote?: string) => {
    return updateRequestStatus(id, newStatus, undefined, resolutionNote);
  };

  const captionLength = caption.length;
  
  // Check if sections have content for badges
  const hasBriefing = briefingTitle || briefingRich;
  const briefingFileCount = briefingFiles.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/content/production/${batchId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{title || 'Novo Post'}</h1>
            {hasBriefing && (
              <Badge variant="secondary" className="text-xs">B</Badge>
            )}
            {totalChangeRequestsCount > 0 && (
              <Badge 
                variant={openChangeRequestsCount > 0 ? "destructive" : "outline"} 
                className="text-xs"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {openChangeRequestsCount}/{totalChangeRequestsCount}
              </Badge>
            )}
            {(briefingFileCount + attachments.length) > 0 && (
              <Badge variant="outline" className="text-xs">
                <Paperclip className="h-3 w-3 mr-1" />
                {briefingFileCount + attachments.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {clientName} • {formatMonthRef(batch.month_ref)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus status={saveStatus} size="sm" onRetry={() => flush()} />
          <ConfirmDeleteDialog
            itemName={title || 'este post'}
            onConfirm={handleDelete}
          >
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmDeleteDialog>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const next = v as PostDetailTab;
          setActiveTab(next);
          if (TAB_STORAGE_KEY) sessionStorage.setItem(TAB_STORAGE_KEY, next);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="post">Post</TabsTrigger>
          <TabsTrigger value="briefing" className="flex items-center gap-1">
            Briefing
            {hasBriefing && <Badge variant="secondary" className="h-4 w-4 p-0 text-[10px] rounded-full">•</Badge>}
          </TabsTrigger>
          <TabsTrigger value="caption">Legenda</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="changes" className="flex items-center gap-1">
            Alterações
            {openChangeRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {openChangeRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
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
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  placeholder="Ex: Reels - Depoimento Cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select value={channel || '_none_'} onValueChange={handleChannelChange}>
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
                <Select value={status} onValueChange={(v) => handleStatusChange(v as PostStatus)}>
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

              {/* Drawer toggle */}
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Post Gaveta</p>
                    <p className="text-xs text-muted-foreground">Reservar este post para uso futuro (ex: planejamento de dezembro)</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={post.is_drawer}
                    onChange={(e) => {
                      saveNow({ is_drawer: e.target.checked });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Cargo Responsável</Label>
                <Select
                  value={
                    isVariableStage
                      ? ((getRoleKeyFromFormat(format) as ResponsibleRoleKey | null) || responsibleRoleKey)
                      : responsibleRoleKey
                  }
                  onValueChange={(v) => handleRoleChange(v as ResponsibleRoleKey)}
                  disabled={isVariableStage}
                >
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
                {isVariableStage && (
                  <p className="text-xs text-muted-foreground">
                    Cargo travado nesta etapa (Produção/Alterações): é definido automaticamente pelo formato.
                  </p>
                )}
              </div>
              
              {showTeamWarning && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-sm flex items-center justify-between gap-2">
                    <span>⚠️ O cargo "{RESPONSIBLE_ROLE_OPTIONS.find(o => o.value === responsibleRoleKey)?.label}" não está configurado no Time da Conta deste cliente.</span>
                    {client && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(`/crm/${client.id}?tab=team`)}
                        className="whitespace-nowrap"
                      >
                        Definir Time
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label>Responsável (Usuário)</Label>
                {/* Read-only assignee display - assignment is automatic based on role */}
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span className="text-sm">
                    {assigneeId 
                      ? getActiveMembers().find(m => m.id === assigneeId)?.name || 'Membro não encontrado'
                      : 'Nenhum responsável definido'
                    }
                  </span>
                  {!assigneeId && (
                    <span className="text-xs text-destructive">
                      (Configure o Time da Conta)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  O responsável é atribuído automaticamente pelo Time da Conta do cliente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Briefing Tab with nested tabs */}
        <TabsContent value="briefing">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="content" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Conteúdo
                  </TabsTrigger>
                  <TabsTrigger value="files" className="flex items-center gap-1">
                    <Paperclip className="h-4 w-4" />
                    Arquivos
                    {briefingFileCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {briefingFileCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="briefing-title">Título do Briefing</Label>
                    <Input
                      id="briefing-title"
                      value={briefingTitle}
                      onChange={(e) => handleBriefingTitleChange(e.target.value)}
                      onBlur={handleBriefingTitleBlur}
                      placeholder="Ex: Briefing para Reels de Depoimento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conteúdo do Briefing</Label>
                    <RichTextEditor
                      content={briefingRich}
                      onChange={handleBriefingRichChange}
                      onBlur={handleBriefingRichBlur}
                      placeholder="Descreva o briefing do post: objetivo, referências, tom de voz, etc."
                    />
                    <p className="text-xs text-muted-foreground">
                      Salvamento automático. Use a barra de ferramentas para formatar o texto.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="files">
                  <MultiFileUpload
                    files={briefingFiles}
                    postId={postId!}
                    context="briefing"
                    onFileUploaded={handleBriefingFileUploaded}
                    onFileDeleted={handleBriefingFileDeleted}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Requests Tab */}
        <TabsContent value="changes">
          <ChangeRequestsTab
            requests={changeRequests}
            loading={loadingChangeRequests}
            onAddRequest={handleAddChangeRequest}
            onUpdateStatus={handleUpdateChangeRequestStatus}
            onDelete={deleteChangeRequest}
            onPostStatusChange={(newStatus) => handleStatusChange(newStatus)}
            currentPostStatus={status}
          />
        </TabsContent>

        <TabsContent value="caption">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label>Legenda</Label>
                <RichTextEditor
                  content={caption}
                  onChange={handleCaptionChange}
                  onBlur={handleCaptionBlur}
                  placeholder="Escreva a legenda do post: texto, hashtags, links..."
                />
                <p className="text-xs text-muted-foreground">
                  Salvamento automático. Use a barra de ferramentas para formatar o texto.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arquivos do Post</CardTitle>
              <p className="text-sm text-muted-foreground">
                Arquivos gerais do post. Para anexos de referência, use a aba Briefing.
              </p>
            </CardHeader>
            <CardContent>
              {loadingAttachments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

      {/* AI Suggestion Original Section */}
      {post?.sugerido_por_ia && (post.legenda_sugerida || post.briefing_sugerido) && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-[hsl(var(--accent-primary,24_95%_53%))]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Sugestão Original da IA</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {post.legenda_sugerida && (
              <div>
                <Label className="text-xs text-muted-foreground">Legenda Sugerida</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap text-muted-foreground bg-muted/40 rounded-lg p-3">{post.legenda_sugerida}</p>
              </div>
            )}
            {post.briefing_sugerido && (
              <div>
                <Label className="text-xs text-muted-foreground">Briefing Sugerido</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap text-muted-foreground bg-muted/40 rounded-lg p-3">{post.briefing_sugerido}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
