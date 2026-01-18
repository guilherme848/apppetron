import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useContentProduction } from '@/contexts/ContentProductionContext';
import { PostForm } from '@/components/content/PostForm';
import { BATCH_STATUS_OPTIONS, BatchStatus, POST_STATUS_OPTIONS, CHANNEL_OPTIONS, FORMAT_OPTIONS, ContentPost } from '@/types/contentProduction';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    batches, posts, accounts, loading, 
    updateBatch, deleteBatch, addPost, updatePost, deletePost, fetchPosts 
  } = useContentProduction();

  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [notes, setNotes] = useState('');

  const batch = batches.find((b) => b.id === id);
  const batchPosts = posts.filter((p) => p.batch_id === id);

  useEffect(() => {
    if (id) {
      fetchPosts(id);
    }
  }, [id, fetchPosts]);

  useEffect(() => {
    if (batch) {
      setNotes(batch.notes || '');
    }
  }, [batch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Pacote não encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/content/production')}>
          Voltar
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

  const handleStatusChange = async (status: BatchStatus) => {
    await updateBatch(batch.id, { status });
    toast.success('Status atualizado');
  };

  const handleNotesBlur = async () => {
    if (notes !== batch.notes) {
      await updateBatch(batch.id, { notes });
      toast.success('Notas salvas');
    }
  };

  const handleDeleteBatch = async () => {
    await deleteBatch(batch.id);
    toast.success('Pacote excluído');
    navigate('/content/production');
  };

  const handlePostSubmit = async (data: any) => {
    return addPost({ ...data, batch_id: batch.id });
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
    toast.success('Post excluído');
  };

  const getChannelLabel = (value: string | null) => 
    CHANNEL_OPTIONS.find((o) => o.value === value)?.label || value || '-';
  const getFormatLabel = (value: string | null) => 
    FORMAT_OPTIONS.find((o) => o.value === value)?.label || value || '-';
  const getStatusLabel = (value: string) => 
    POST_STATUS_OPTIONS.find((o) => o.value === value)?.label || value;
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'done': return 'default';
      case 'doing': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/content/production')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{clientName}</h1>
          <p className="text-muted-foreground">{formatMonthRef(batch.month_ref)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={batch.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {BATCH_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir pacote?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os posts deste pacote serão excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBatch}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas do Pacote</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Observações sobre este pacote..."
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Posts do Mês ({batchPosts.length})</CardTitle>
          <Button size="sm" onClick={() => { setEditingPost(null); setPostFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Post
          </Button>
        </CardHeader>
        <CardContent>
          {batchPosts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum post cadastrado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Limite</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>{getChannelLabel(post.channel)}</TableCell>
                    <TableCell>{getFormatLabel(post.format)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(post.status)}>
                        {getStatusLabel(post.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {post.due_date ? new Date(post.due_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingPost(post); setPostFormOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
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
                              <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PostForm
        open={postFormOpen}
        onOpenChange={setPostFormOpen}
        batchId={batch.id}
        post={editingPost}
        onSubmit={handlePostSubmit}
        onUpdate={updatePost}
      />
    </div>
  );
}
