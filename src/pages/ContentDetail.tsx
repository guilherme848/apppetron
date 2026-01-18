import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useContent } from '@/contexts/ContentContext';
import { ContentForm } from '@/components/content/ContentForm';
import { ContentStatusBadge, ContentPriorityBadge, OverdueBadge } from '@/components/content/ContentBadges';
import { CHANNEL_OPTIONS, FORMAT_OPTIONS } from '@/types/content';

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    loading,
    accounts,
    getContentById,
    getRevisionsByContent,
    updateContentItem,
    deleteContentItem,
    duplicateContentItem,
    addRevision,
    fetchRevisions,
    revisions,
  } = useContent();

  const [formOpen, setFormOpen] = useState(false);
  const [newRevision, setNewRevision] = useState('');
  const [addingRevision, setAddingRevision] = useState(false);

  const content = getContentById(id!);
  const contentRevisions = getRevisionsByContent(id!);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (id) {
      fetchRevisions(id);
    }
  }, [id, fetchRevisions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Conteúdo não encontrado</p>
        <Button variant="link" onClick={() => navigate('/content')}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  const getAccountName = (clientId: string | null) => {
    if (!clientId) return '-';
    const account = accounts.find((a) => a.id === clientId);
    return account?.name || '-';
  };

  const getChannelLabel = (channel: string | null) => {
    if (!channel) return '-';
    return CHANNEL_OPTIONS.find((c) => c.value === channel)?.label || channel;
  };

  const getFormatLabel = (format: string | null) => {
    if (!format) return '-';
    return FORMAT_OPTIONS.find((f) => f.value === format)?.label || format;
  };

  const isOverdue = content.due_date && content.due_date < today && content.status !== 'published';

  const handleSubmit = async (data: any) => {
    await updateContentItem(id!, data);
  };

  const handleDuplicate = async () => {
    const newItem = await duplicateContentItem(id!);
    if (newItem) {
      navigate(`/content/${newItem.id}`);
    }
  };

  const handleDelete = async () => {
    await deleteContentItem(id!);
    navigate('/content');
  };

  const handleAddRevision = async () => {
    if (!newRevision.trim()) return;
    setAddingRevision(true);
    await addRevision(id!, newRevision.trim());
    setNewRevision('');
    setAddingRevision(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/content')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{content.title}</h1>
              {isOverdue && <OverdueBadge />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <ContentStatusBadge status={content.status} />
              <ContentPriorityBadge priority={content.priority} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            Editar
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">{getAccountName(content.client_id)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Responsável:</span>
                <p className="font-medium">{content.owner || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Canal:</span>
                <p className="font-medium">{getChannelLabel(content.channel)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Formato:</span>
                <p className="font-medium">{getFormatLabel(content.format)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prazo:</span>
                <p className="font-medium">
                  {content.due_date ? new Date(content.due_date).toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Agendamento:</span>
                <p className="font-medium">
                  {content.scheduled_at
                    ? new Date(content.scheduled_at).toLocaleString('pt-BR')
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Publicado em:</span>
                <p className="font-medium">
                  {content.published_at
                    ? new Date(content.published_at).toLocaleString('pt-BR')
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Atualizado:</span>
                <p className="font-medium">
                  {new Date(content.updated_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revisões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                value={newRevision}
                onChange={(e) => setNewRevision(e.target.value)}
                placeholder="Adicionar nota de revisão..."
                rows={2}
              />
              <Button onClick={handleAddRevision} disabled={addingRevision || !newRevision.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {contentRevisions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhuma revisão ainda
                </p>
              ) : (
                contentRevisions.map((rev) => (
                  <div key={rev.id} className="border rounded p-3 text-sm">
                    <p>{rev.notes}</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      {new Date(rev.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Brief</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {content.brief || 'Nenhum briefing definido.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Copy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">
              {content.copy_text || 'Nenhum copy definido.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {content.creative_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas Criativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{content.creative_notes}</p>
          </CardContent>
        </Card>
      )}

      <ContentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        content={content}
        accounts={accounts}
      />
    </div>
  );
}
