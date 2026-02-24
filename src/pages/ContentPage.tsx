import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContent } from '@/contexts/ContentContext';
import { ContentForm } from '@/components/content/ContentForm';
import { ContentPipeline } from '@/components/content/ContentPipeline';
import { ContentCalendar } from '@/components/content/ContentCalendar';
import { CONTENT_STATUS_OPTIONS, CONTENT_PRIORITY_OPTIONS, CHANNEL_OPTIONS, FORMAT_OPTIONS, ContentStatus } from '@/types/content';

export default function ContentPage() {
  const navigate = useNavigate();
  const {
    contentItems,
    accounts,
    loading,
    addContentItem,
    updateContentItem,
    duplicateContentItem,
  } = useContent();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return contentItems.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesClient = clientFilter === 'all' || item.client_id === clientFilter;
      const matchesChannel = channelFilter === 'all' || item.channel === channelFilter;
      const matchesFormat = formatFilter === 'all' || item.format === formatFilter;
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesClient && matchesChannel && matchesFormat && matchesPriority;
    });
  }, [contentItems, search, statusFilter, clientFilter, channelFilter, formatFilter, priorityFilter]);

  const handleSubmit = async (data: any) => {
    await addContentItem(data);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }
    await updateContentItem(id, updates);
  };

  const handleApprove = async (id: string) => {
    await updateContentItem(id, { status: 'approved' as ContentStatus });
  };

  const handlePublish = async (id: string) => {
    await updateContentItem(id, {
      status: 'published' as ContentStatus,
      published_at: new Date().toISOString(),
    });
  };

  const handleDuplicate = async (id: string) => {
    await duplicateContentItem(id);
  };

  const handleView = (id: string) => {
    navigate(`/content/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conteúdo</h1>
          <p className="text-muted-foreground">Gestão de conteúdo para Social Media</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {CONTENT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {CHANNEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CONTENT_PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-4">
          <ContentPipeline
            items={filteredItems}
            accounts={accounts}
            onStatusChange={handleStatusChange}
            onView={handleView}
            onDuplicate={handleDuplicate}
            onApprove={handleApprove}
            onPublish={handlePublish}
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <ContentCalendar
            items={filteredItems}
            accounts={accounts}
            onItemClick={handleView}
          />
        </TabsContent>
      </Tabs>

      <ContentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        accounts={accounts}
      />
    </div>
  );
}
