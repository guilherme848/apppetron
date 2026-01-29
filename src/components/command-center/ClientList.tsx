import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientListItem, ClientListView, HealthStatus } from '@/types/commandCenter';
import { Search, ExternalLink, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ClientListProps {
  getClientList: (view: ClientListView) => ClientListItem[];
  onClientClick: (clientId: string) => void;
}

const VIEW_TABS: { value: ClientListView; label: string }[] = [
  { value: 'action_today', label: 'Ação Hoje' },
  { value: 'onboarding_delayed', label: 'Onboarding Atrasado' },
  { value: 'detractors', label: 'Detratores' },
  { value: 'no_meeting', label: 'Sem Reunião 30d' },
  { value: 'critical', label: 'Críticos' },
  { value: 'promoters', label: 'Promotores' },
  { value: 'churned', label: 'Cancelamentos' },
];

function getHealthBadge(status: HealthStatus) {
  switch (status) {
    case 'healthy':
      return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Saudável</Badge>;
    case 'attention':
      return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">Atenção</Badge>;
    case 'critical':
      return <Badge variant="destructive">Crítico</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Ativo</Badge>;
    case 'onboarding':
      return <Badge variant="secondary">Onboarding</Badge>;
    case 'churned':
    case 'canceled':
      return <Badge variant="destructive">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ClientList({ getClientList, onClientClick }: ClientListProps) {
  const [activeView, setActiveView] = useState<ClientListView>('action_today');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof ClientListItem>('healthScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const clients = getClientList(activeView);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
    c.nicheName?.toLowerCase().includes(search.toLowerCase())
  );

  const sortedClients = [...filteredClients].sort((a, b) => {
    const aVal = a[sortField] ?? '';
    const bVal = b[sortField] ?? '';
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return sortDir === 'asc' 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (field: keyof ClientListItem) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Lista Inteligente de Clientes</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ClientListView)}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {VIEW_TABS.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
                <span className="ml-1.5 text-xs border rounded-full px-1.5 py-0.5">
                  {getClientList(tab.value).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {VIEW_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Cliente
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('healthScore')}
                      >
                        <div className="flex items-center gap-1">
                          Health
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>NPS</TableHead>
                      <TableHead>Tarefas Atrasadas</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Nicho</TableHead>
                      <TableHead>UF</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedClients.slice(0, 20).map((client) => (
                        <TableRow 
                          key={client.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onClientClick(client.id)}
                        >
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{getStatusBadge(client.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{client.healthScore}</span>
                              {getHealthBadge(client.healthStatus)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {client.npsScore !== undefined ? (
                              <Badge 
                                variant={client.npsScore >= 9 ? 'default' : client.npsScore >= 7 ? 'secondary' : 'destructive'}
                              >
                                {client.npsScore}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {client.overdueTasksCount > 0 ? (
                              <Badge variant="destructive">{client.overdueTasksCount}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{client.serviceName || '-'}</TableCell>
                          <TableCell className="text-sm">{client.nicheName || '-'}</TableCell>
                          <TableCell className="text-sm">{client.state || '-'}</TableCell>
                          <TableCell className="text-sm">{client.ownerName || '-'}</TableCell>
                          <TableCell>
                            <Link to={`/cs/client/${client.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {sortedClients.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Mostrando 20 de {sortedClients.length} clientes
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
