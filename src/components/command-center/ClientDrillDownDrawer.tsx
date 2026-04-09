import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientListItem, HealthStatus } from '@/types/commandCenter';
import { Download, Search, ExternalLink, ClipboardList, AlertTriangle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ClientDrillDownDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  clients: ClientListItem[];
  onCreateTask?: (clientIds: string[]) => void;
  onCreatePlaybook?: (clientIds: string[]) => void;
  onMarkAtRisk?: (clientIds: string[]) => void;
}

function getHealthBadge(status: HealthStatus) {
  switch (status) {
    case 'healthy':
      return <Badge className="bg-success/10 text-success hover:bg-success/20">Saudável</Badge>;
    case 'attention':
      return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Atenção</Badge>;
    case 'critical':
      return <Badge variant="destructive">Crítico</Badge>;
  }
}

export function ClientDrillDownDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  clients,
  onCreateTask,
  onCreatePlaybook,
  onMarkAtRisk,
}: ClientDrillDownDrawerProps) {
  const [search, setSearch] = useState('');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedClients(new Set());
    }
  }, [open]);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.ownerName?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleClient = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const toggleAll = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  };

  const exportToCsv = () => {
    const headers = ['Cliente', 'Status', 'Health Score', 'NPS', 'Plano', 'Nicho', 'UF', 'Owner'];
    const rows = filteredClients.map(c => [
      c.name,
      c.status,
      c.healthScore,
      c.npsScore ?? '-',
      c.serviceName ?? '-',
      c.nicheName ?? '-',
      c.state ?? '-',
      c.ownerName ?? '-',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedIds = Array.from(selectedClients);
  const hasSelection = selectedIds.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{title}</SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>

        {/* Search and Actions */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="icon" onClick={exportToCsv} title="Exportar CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Batch Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {hasSelection ? `${selectedIds.length} selecionados` : 'Selecione para ações em lote'}
            </span>
            {hasSelection && (
              <>
                {onCreateTask && (
                  <Button size="sm" variant="outline" onClick={() => onCreateTask(selectedIds)}>
                    <ClipboardList className="h-4 w-4 mr-1" />
                    Criar Tarefas
                  </Button>
                )}
                {onCreatePlaybook && (
                  <Button size="sm" variant="outline" onClick={() => onCreatePlaybook(selectedIds)}>
                    <FileText className="h-4 w-4 mr-1" />
                    Criar Playbooks
                  </Button>
                )}
                {onMarkAtRisk && (
                  <Button size="sm" variant="outline" onClick={() => onMarkAtRisk(selectedIds)}>
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Marcar Risco
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Client Count */}
        <div className="text-sm text-muted-foreground mb-2">
          {filteredClients.length} cliente(s)
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                    onChange={toggleAll}
                    className="rounded border-muted-foreground"
                  />
                </TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>NPS</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedClients.has(client.id)}
                        onChange={() => toggleClient(client.id)}
                        className="rounded border-muted-foreground"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{client.healthScore}</span>
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
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{client.serviceName || '-'}</TableCell>
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
      </SheetContent>
    </Sheet>
  );
}
