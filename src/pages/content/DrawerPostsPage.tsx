import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Loader2, Search, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DrawerPost {
  id: string;
  title: string;
  batch_id: string;
  format: string | null;
  channel: string | null;
  status: string;
  month_ref: string;
  client_id: string | null;
  client_name: string;
}

export default function DrawerPostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<DrawerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDrawerPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_posts')
        .select('id, title, batch_id, format, channel, status, content_batches!inner(id, month_ref, client_id, accounts!inner(id, name))')
        .eq('is_drawer', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching drawer posts:', error);
        setPosts([]);
      } else {
        const mapped = (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          batch_id: p.batch_id,
          format: p.format,
          channel: p.channel,
          status: p.status,
          month_ref: p.content_batches?.month_ref || '',
          client_id: p.content_batches?.client_id || null,
          client_name: p.content_batches?.accounts?.name || 'Sem cliente',
        }));
        setPosts(mapped);
      }
      setLoading(false);
    };
    fetchDrawerPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) return posts;
    const term = searchTerm.toLowerCase();
    return posts.filter(p => p.client_name.toLowerCase().includes(term) || p.title?.toLowerCase().includes(term));
  }, [posts, searchTerm]);

  // Group by client
  const grouped = useMemo(() => {
    const map = new Map<string, { clientName: string; posts: DrawerPost[] }>();
    filteredPosts.forEach(p => {
      const key = p.client_id || 'none';
      if (!map.has(key)) {
        map.set(key, { clientName: p.client_name, posts: [] });
      }
      map.get(key)!.posts.push(p);
    });
    // Sort clients alphabetically
    return Array.from(map.entries()).sort((a, b) => a[1].clientName.localeCompare(b[1].clientName));
  }, [filteredPosts]);

  const formatMonthRef = (monthRef: string) => {
    if (!monthRef) return '';
    const [year, month] = monthRef.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-72" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <Archive className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Posts Gaveta</h1>
        </div>
        <p className="text-muted-foreground mt-1">Posts reservados para uso futuro, agrupados por cliente</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{grouped.length} clientes</span>
        <span>•</span>
        <span>{filteredPosts.length} posts gaveta</span>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum post marcado como gaveta'}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([clientId, { clientName, posts: clientPosts }]) => (
            <Card key={clientId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{clientName}</CardTitle>
                  <Badge variant="secondary">{clientPosts.length} posts</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {clientPosts
                    .sort((a, b) => a.month_ref.localeCompare(b.month_ref))
                    .map((post) => (
                    <div key={post.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{post.title || 'Sem título'}</p>
                          {post.format && (
                            <Badge variant="outline" className="text-[10px] shrink-0">{post.format}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatMonthRef(post.month_ref)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/content/production/${post.batch_id}/posts/${post.id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
