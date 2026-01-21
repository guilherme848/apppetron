import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ContentPost, POST_STATUS_OPTIONS, CHANNEL_OPTIONS, FORMAT_OPTIONS } from '@/types/contentProduction';
import { JobRole } from '@/types/contentProduction';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SortablePostListProps {
  posts: ContentPost[];
  batchId: string;
  isVariableStage: boolean;
  planningResponsibleName: string | null;
  roles: JobRole[];
  getRoleById: (id: string) => JobRole | undefined;
  onPostStatusChange: (postId: string, status: string) => Promise<void>;
  onPostResponsibleChange: (postId: string, roleId: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onOrderChange: (posts: ContentPost[]) => void;
}

interface SortableRowProps {
  post: ContentPost;
  batchId: string;
  isVariableStage: boolean;
  planningResponsibleName: string | null;
  roles: JobRole[];
  getRoleById: (id: string) => JobRole | undefined;
  onPostStatusChange: (postId: string, status: string) => Promise<void>;
  onPostResponsibleChange: (postId: string, roleId: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const getChannelLabel = (value: string | null) =>
  CHANNEL_OPTIONS.find((o) => o.value === value)?.label || value || '-';
const getFormatLabel = (value: string | null) =>
  FORMAT_OPTIONS.find((o) => o.value === value)?.label || value || '-';

function SortableRow({
  post,
  batchId,
  isVariableStage,
  planningResponsibleName,
  roles,
  getRoleById,
  onPostStatusChange,
  onPostResponsibleChange,
  onDeletePost,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: SortableRowProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
      <TableCell className="w-10">
        <div className="flex items-center gap-1">
          {/* Drag handle for desktop */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded hidden sm:block touch-none"
            aria-label="Arrastar para reordenar"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {/* Mobile up/down buttons */}
          <div className="flex flex-col sm:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveUp}
              disabled={!canMoveUp}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveDown}
              disabled={!canMoveDown}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {post.title || <span className="text-muted-foreground italic">Sem título</span>}
      </TableCell>
      <TableCell>{getChannelLabel(post.channel)}</TableCell>
      <TableCell>{getFormatLabel(post.format)}</TableCell>
      <TableCell>
        {isVariableStage ? (
          <Select
            value={post.responsible_role_id || ''}
            onValueChange={(v) => onPostResponsibleChange(post.id, v)}
          >
            <SelectTrigger
              className={`w-32 h-8 bg-background ${!post.responsible_role_id ? 'border-yellow-500' : ''}`}
            >
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="_none_">-</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : post.responsible_role_id ? (
          <Badge variant="outline">{getRoleById(post.responsible_role_id)?.name || '-'}</Badge>
        ) : planningResponsibleName ? (
          <Badge variant="outline">{planningResponsibleName}</Badge>
        ) : (
          <span className="text-yellow-600 dark:text-yellow-400">Não definido</span>
        )}
      </TableCell>
      <TableCell>
        <Select value={post.status} onValueChange={(v) => onPostStatusChange(post.id, v)}>
          <SelectTrigger className="w-28 h-8 bg-background">
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
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/content/production/${batchId}/posts/${post.id}`)}
          >
            <Eye className="h-4 w-4" />
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
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDeletePost(post.id)}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function SortablePostList({
  posts,
  batchId,
  isVariableStage,
  planningResponsibleName,
  roles,
  getRoleById,
  onPostStatusChange,
  onPostResponsibleChange,
  onDeletePost,
  onOrderChange,
}: SortablePostListProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const persistOrder = useCallback(async (reorderedPosts: ContentPost[]) => {
    setIsSaving(true);
    try {
      // Update sort_order for all posts in the batch
      const updates = reorderedPosts.map((post, index) => ({
        id: post.id,
        sort_order: index,
      }));

      // Batch update using multiple updates
      const promises = updates.map(({ id, sort_order }) =>
        supabase
          .from('content_posts')
          .update({ sort_order })
          .eq('id', id)
      );

      await Promise.all(promises);
      toast.success('Ordem salva');
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Erro ao salvar ordem');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = posts.findIndex((p) => p.id === active.id);
        const newIndex = posts.findIndex((p) => p.id === over.id);
        const reordered = arrayMove(posts, oldIndex, newIndex);
        onOrderChange(reordered);
        persistOrder(reordered);
      }
    },
    [posts, onOrderChange, persistOrder]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const reordered = arrayMove(posts, index, index - 1);
      onOrderChange(reordered);
      persistOrder(reordered);
    },
    [posts, onOrderChange, persistOrder]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= posts.length - 1) return;
      const reordered = arrayMove(posts, index, index + 1);
      onOrderChange(reordered);
      persistOrder(reordered);
    },
    [posts, onOrderChange, persistOrder]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post, index) => (
              <SortableRow
                key={post.id}
                post={post}
                batchId={batchId}
                isVariableStage={isVariableStage}
                planningResponsibleName={planningResponsibleName}
                roles={roles}
                getRoleById={getRoleById}
                onPostStatusChange={onPostStatusChange}
                onPostResponsibleChange={onPostResponsibleChange}
                onDeletePost={onDeletePost}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                canMoveUp={index > 0}
                canMoveDown={index < posts.length - 1}
              />
            ))}
          </TableBody>
        </Table>
      </SortableContext>
      {isSaving && (
        <div className="text-xs text-muted-foreground text-center py-1">Salvando...</div>
      )}
    </DndContext>
  );
}
