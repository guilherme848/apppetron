import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, Paperclip, AlertTriangle, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FileUpload } from '@/components/content/FileUpload';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { MultiFileUpload } from '@/components/content/MultiFileUpload';
import { ChangeRequestsTab } from '@/components/content/ChangeRequestsTab';
import { SaveStatus } from '@/components/ui/save-status';
import { useAutoSave, useAutoSaveNavigation } from '@/hooks/useAutoSave';
import { CHANNEL_OPTIONS, FORMAT_OPTIONS, POST_STATUS_OPTIONS, PostStatus, PostAttachment, ContentPostFile, ContentBatch, ContentPost, BatchStatus, ItemType } from '@/types/contentProduction';
import { RESPONSIBLE_ROLE_OPTIONS, ResponsibleRoleKey } from '@/types/crm';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useChangeRequests } from '@/hooks/useChangeRequests';
import { Badge } from '@/components/ui/badge';

export default function MarketingPostDetail() {
  const { batchId, postId } = useParams<{ batchId: string; postId: string }>();
  const navigate = useNavigate();
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

  const initialLoadComplete = useRef(false);
  
  const [batch, setBatch] = useState<ContentBatch | null>(null);
  const [post, setPost] = useState<ContentPost | null>(null);
  const [loading, setLoading] = useState(true);

  type PostDetailTab = 'post' | 'briefing' | 'caption' | 'files' | 'changes';
  const TAB_STORAGE_KEY = postId ? `marketingPostDetailTab:${postId}` : null;
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

  // Fetch batch data (agency scope only)
  const fetchBatch = useCallback(async () => {
    if (!batchId) return;
    const { data, error } = await supabase
      .from('content_batches')
      .select('*')
      .eq('id', batchId)
      .eq('scope', 'agency')
      .single();

    if (error || !data) {
      console.error('Error fetching batch:', error);
      setBatch(null);
      return;
    }

    setBatch({
      id: data.id,
      client_id: data.client_id,
      month_ref: data.month_ref,
      status: data.status as BatchStatus,
      notes: data.notes,
      planning_due_date: data.planning_due_date,
      delivery_date: data.delivery_date,
      archived: data.archived ?? false,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  }, [batchId]);

  // Fetch post data
  const fetchPost = useCallback(async () => {
    if (!postId) return;
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error || !data) {
      console.error('Error fetching post:', error);
      setPost(null);
      return;
    }

    setPost({
      id: data.id,
      batch_id: data.batch_id,
      title: data.title,
      channel: data.channel,
      format: data.format,
      status: data.status as PostStatus,
      due_date: data.due_date,
      briefing: data.briefing,
      briefing_title: data.briefing_title,
      briefing_rich: data.briefing_rich,
      caption: data.caption,
      changes_title: data.changes_title,
      changes_rich: data.changes_rich,
      item_type: data.item_type as ItemType | null,
      responsible_role_id: data.responsible_role_id,
      responsible_role_key: data.responsible_role_key,
      assignee_id: data.assignee_id,
      started_at: data.started_at,
      completed_at: data.completed_at,
      sort_order: data.sort_order ?? 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  }, [postId]);

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
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBatch(), fetchPost(), fetchAttachments(), fetchContentFiles(), fetchChangeRequests()]);
      setLoading(false);
    };
    loadData();
  }, [fetchBatch, fetchPost, fetchAttachments, fetchContentFiles, fetchChangeRequests]);

  useEffect(() => {
    if (!TAB_STORAGE_KEY) return;
    const saved = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (saved === 'post' || saved === 'briefing' || saved === 'caption' || saved === 'files' || saved === 'changes') {
      setActiveTab(saved);
    } else {
      setActiveTab('post');
    }
  }, [TAB_STORAGE_KEY]);

  const savedTitleRef = useRef(title);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      savedTitleRef.current = post.title || '';
      setChannel(post.channel || '');
      setFormat(post.format || '');
      setStatus(post.status);
      setCaption(post.caption || '');
      
      setBriefingTitle(post.briefing_title || '');
      const richContent = post.briefing_rich || '';
      const legacyBriefing = post.briefing || '';
      setBriefingRich(richContent || legacyBriefing);
      
      const roleKey = post.responsible_role_key as ResponsibleRoleKey || 'social';
      setResponsibleRoleKey(roleKey);
      setAssigneeId(post.assignee_id || '');
      
      setTimeout(() => {
        initialLoadComplete.current = true;
      }, 100);
    }
  }, [post]);

  // AutoSave setup
  const handleSavePost = useCallback(async (data: Record<string, any>) => {
    if (!post) return;
    const { data: updatedData, error } = await supabase
      .from('content_posts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', post.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving post:', error);
      throw error;
    }
    
    if (updatedData) {
      setPost((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...updatedData,
          status: updatedData.status as PostStatus,
          item_type: updatedData.item_type as ItemType | null,
        };
      });
    }
  }, [post]);

  const { status: saveStatus, saveNow, queueChange, flush, hasPendingChanges } = useAutoSave({
    onSave: handleSavePost,
    showToasts: false,
  });

  useAutoSaveNavigation(flush, hasPendingChanges);

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
        <Button variant="outline" onClick={() => navigate(`/commercial/marketing/${batchId}`)}>
          Voltar ao Pacote
        </Button>
      </div>
    );
  }

  const formatMonthRef = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  // Field change handlers
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (initialLoadComplete.current && value.trim() !== savedTitleRef.current.trim()) {
      queueChange({ title: value.trim() });
    }
  };

  const handleTitleBlur = async () => {
    if (initialLoadComplete.current && title.trim() !== savedTitleRef.current.trim()) {
      await flush();
      savedTitleRef.current = title.trim();
    }
  };

  const handleTitleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (initialLoadComplete.current && title.trim() !== savedTitleRef.current.trim()) {
        await flush();
        savedTitleRef.current = title.trim();
      }
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
    if (initialLoadComplete.current) {
      await saveNow({ responsible_role_key: newRoleKey });
    }
  };

  const handleBriefingTitleChange = (value: string) => {
    setBriefingTitle(value);
    if (initialLoadComplete.current) {
      queueChange({ briefing_title: value || null });
    }
  };

  const handleBriefingTitleBlur = async () => {
    if (initialLoadComplete.current) {
      await flush();
    }
  };

  const handleBriefingRichChange = (value: string) => {
    setBriefingRich(value);
  };

  const handleBriefingRichBlur = async () => {
    if (initialLoadComplete.current && post) {
      const currentValue = post.briefing_rich || '';
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

  const handleDelete = async () => {
    await supabase.from('content_posts').delete().eq('id', post.id);
    toast.success('Post excluído');
    navigate(`/commercial/marketing/${batchId}`);
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
  const hasBriefing = briefingTitle || briefingRich;
  const briefingFileCount = briefingFiles.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/commercial/marketing/${batchId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
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
            Marketing Interno • {formatMonthRef(batch.month_ref)}
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

        {/* Post Tab */}
        <TabsContent value="post" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  placeholder="Título do post..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select value={channel || '_none_'} onValueChange={handleChannelChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="_none_">Nenhum</SelectItem>
                      {CHANNEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={format || '_none_'} onValueChange={handleFormatChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="_none_">Nenhum</SelectItem>
                      {FORMAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => handleStatusChange(v as PostStatus)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {POST_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={responsibleRoleKey} onValueChange={(v) => handleRoleChange(v as ResponsibleRoleKey)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {RESPONSIBLE_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Executante</Label>
                  <Select value={assigneeId || '_none_'} onValueChange={(v) => {
                    const newAssignee = v === '_none_' ? '' : v;
                    setAssigneeId(newAssignee);
                    if (initialLoadComplete.current) {
                      saveNow({ assignee_id: newAssignee || null });
                    }
                  }}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="_none_">Nenhum</SelectItem>
                      {getActiveMembers().map((member) => (
                        <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Briefing Tab */}
        <TabsContent value="briefing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Briefing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="briefing-title">Título do Briefing</Label>
                <Input
                  id="briefing-title"
                  value={briefingTitle}
                  onChange={(e) => handleBriefingTitleChange(e.target.value)}
                  onBlur={handleBriefingTitleBlur}
                  placeholder="Título ou objetivo..."
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <RichTextEditor
                  content={briefingRich}
                  onChange={handleBriefingRichChange}
                  onBlur={handleBriefingRichBlur}
                  placeholder="Descreva o briefing..."
                />
              </div>

              <div className="space-y-2">
                <Label>Arquivos do Briefing</Label>
                <MultiFileUpload
                  files={briefingFiles}
                  postId={postId || ''}
                  context="briefing"
                  onFileUploaded={handleBriefingFileUploaded}
                  onFileDeleted={async (fileId: string, storagePath: string) => {
                    await handleBriefingFileDeleted(fileId);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Caption Tab */}
        <TabsContent value="caption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Legenda</span>
                <span className="text-sm font-normal text-muted-foreground">{captionLength} caracteres</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                content={caption}
                onChange={handleCaptionChange}
                onBlur={handleCaptionBlur}
                placeholder="Escreva a legenda do post..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arquivos Gerais</CardTitle>
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

        {/* Changes Tab */}
        <TabsContent value="changes" className="space-y-4">
          <ChangeRequestsTab
            requests={changeRequests}
            loading={loadingChangeRequests}
            onAddRequest={handleAddChangeRequest}
            onUpdateStatus={handleUpdateChangeRequestStatus}
            onDelete={deleteChangeRequest}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
