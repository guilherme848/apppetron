import { useState, useEffect } from 'react';
import { useClientIntelligence } from '@/hooks/useClientIntelligence';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink, Phone, Mail, MapPin, Lock, Star, Users, FileText, Package, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractForm } from '@/components/crm/ContractForm';
import { AccountForm } from '@/components/crm/AccountForm';
import { AccountRemoveDialog, RemovalType } from '@/components/crm/AccountRemoveDialog';
import { ClientDeliverables } from '@/components/crm/ClientDeliverables';
import { AccountTeamCard } from '@/components/crm/AccountTeamCard';
import { LinksCard } from '@/components/crm/intelligence/LinksCard';
import { ConcorrentesCard } from '@/components/crm/intelligence/ConcorrentesCard';
import { ArquivosCard } from '@/components/crm/intelligence/ArquivosCard';
import { ICPCard } from '@/components/crm/intelligence/ICPCard';
import { ProdutosCard } from '@/components/crm/intelligence/ProdutosCard';
import { InfoGeraisCard } from '@/components/crm/intelligence/InfoGeraisCard';
import { AcoesCard } from '@/components/crm/intelligence/AcoesCard';
import { CompletudeBar } from '@/components/crm/intelligence/CompletudeBar';
import { useClientIntelligenceExpanded } from '@/hooks/useClientIntelligenceExpanded';
import { ClientTrafficSection } from '@/components/crm/ClientTrafficSection';
import { useCrm } from '@/contexts/CrmContext';
import { Contract, ContractStatus, Account } from '@/types/crm';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { toast } from '@/hooks/use-toast';
import { useSensitivePermission } from '@/hooks/useSensitivePermission';
import { useAccountHistory } from '@/hooks/useAccountHistory';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, getInitials, getPlanBadgeStyle } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const EVENT_TYPE_COLORS: Record<string, string> = {
  created: 'bg-[hsl(var(--success))]',
  status_changed: 'bg-primary',
  plan_changed: 'bg-[hsl(var(--info))]',
  traffic_manager_changed: 'bg-primary',
  cs_changed: 'bg-[hsl(var(--info))]',
  team_changed: 'bg-[hsl(var(--warning))]',
  checkup_done: 'bg-[hsl(var(--success))]',
};

export default function CrmDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const {
    accounts, loading, getAccountById, getContractsByAccount,
    updateAccount, softDeleteAccount, churnAccount, addContract, updateContract,
    deleteContract,
  } = useCrm();
  const { services } = useSettings();

  const account = getAccountById(id!);
  const contracts = getContractsByAccount(id!);
  
  const { canViewFinancialValues } = useSensitivePermission();
  const showFinancialValues = canViewFinancialValues();
  const { events: historyEvents, loading: historyLoading } = useAccountHistory(id);
  const { links: clienteLinks, concorrentes, anexos, loading: intelLoading, deleteAnexo, refetch: refetchIntel } = useClientIntelligence(id);
  const {
    inteligencia, arquivos: arquivosIntel, acoes, loading: expandedLoading, completude,
    upsertInteligencia, uploadArquivoInteligencia, deleteArquivoInteligencia,
    addAcao, deleteAcao,
  } = useClientIntelligenceExpanded(id);

  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>();

  const RestrictedValue = () => (
    <TooltipProvider><Tooltip><TooltipTrigger asChild>
      <span className="inline-flex items-center gap-1 text-muted-foreground cursor-help"><Lock className="h-3 w-3" /><span className="text-xs">Restrito</span></span>
    </TooltipTrigger><TooltipContent><p>Restrito ao Administrador</p></TooltipContent></Tooltip></TooltipProvider>
  );

  // Check if service has traffic
  const serviceHasTraffic = account?.service_id ? (services.find((s: any) => s.id === account.service_id) as any)?.has_traffic : false;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10" /><div><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72 mt-2" /></div></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="link" onClick={() => navigate('/crm')}>Voltar para lista</Button>
      </div>
    );
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };
  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getFullAddress = () => {
    const parts = [account.street, account.street_number, account.address_complement, account.neighborhood, account.city, account.state, account.postal_code].filter(v => v != null && String(v).trim() !== '');
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const handleAccountSubmit = async (data: Partial<Account>) => { await updateAccount(id!, data); };
  const handleTeamUpdate = async (field: keyof Account, value: string | number | string[] | null) => { await updateAccount(id!, { [field]: value }); };

  const handleContractSubmit = async (data: { mrr: number; start_date: string; status: ContractStatus; account_id: string }) => {
    if (editingContract) { await updateContract(editingContract.id, data); } else { await addContract(data); }
    setEditingContract(undefined);
  };
  const handleDeleteContract = async (contractId: string) => { await deleteContract(contractId); };

  const handleRemoveConfirm = async (type: RemovalType, churnDate?: string) => {
    if (!account) return;
    if (type === 'churn' && churnDate) {
      const result = await churnAccount(account.id, churnDate);
      if (result.success) { toast({ title: 'Cliente marcado como Churned', description: `${account.name} foi marcado como cancelado.` }); }
      else { toast({ title: 'Erro ao registrar churn', description: 'Não foi possível registrar o cancelamento.', variant: 'destructive' }); }
    } else if (type === 'delete') {
      const result = await softDeleteAccount(account.id);
      if (result.success) { toast({ title: 'Cliente arquivado', description: `${account.name} foi removido da listagem.` }); navigate('/crm'); }
      else { toast({ title: 'Erro ao arquivar cliente', description: 'Não foi possível remover o cliente.', variant: 'destructive' }); }
    }
  };

  const checkupColor: Record<string, string> = { A: 'bg-[hsl(var(--success)/.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/.25)]', B: 'bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)]', C: 'bg-[hsl(var(--warning)/.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/.25)]', D: 'bg-destructive/12 text-destructive border-destructive/25' };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
                account.status === 'active' ? 'bg-[hsl(var(--success)/.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/.25)]' :
                account.status === 'churned' ? 'bg-destructive/12 text-destructive border-destructive/25' :
                'bg-[hsl(var(--warning)/.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/.25)]'
              }`}>
                {account.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                {account.status === 'active' ? 'Ativo' : account.status === 'churned' ? 'Inativo' : 'Lead'}
              </span>

              {/* Plan badge */}
              {account.service_name && (
                <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border ${getPlanBadgeStyle(account.service_name)}`}>
                  {account.service_name}
                </span>
              )}

              {/* Checkup badge */}
              {account.checkup_classificacao ? (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border cursor-help ${checkupColor[account.checkup_classificacao] || ''}`}>
                    {account.checkup_classificacao === 'A' && <Star className="h-3 w-3 fill-current" />}
                    Perfil {account.checkup_classificacao}
                  </span>
                </TooltipTrigger><TooltipContent>
                  <p>Pontuação: {account.checkup_pontuacao} pts{account.checkup_updated_at ? ` — Atualizado em ${new Date(account.checkup_updated_at).toLocaleDateString('pt-BR')}` : ''}</p>
                </TooltipContent></Tooltip></TooltipProvider>
              ) : (
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                  <span className="inline-flex items-center text-[11px] text-muted-foreground px-2 py-0.5 rounded-md border border-border bg-muted/40 cursor-help font-semibold">
                    Sem classificação
                  </span>
                </TooltipTrigger><TooltipContent><p>Checkup não realizado</p></TooltipContent></Tooltip></TooltipProvider>
              )}

              {account.niche && <span className="text-xs text-muted-foreground">• {account.niche}</span>}
              <span className="text-xs text-muted-foreground">• Cliente desde {formatDate(account.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAccountFormOpen(true)} className="bg-primary hover:bg-primary/90">
            <Pencil className="h-4 w-4 mr-2" />Editar
          </Button>
          <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRemoveDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />Remover
          </Button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Time da Conta */}
        <div className="card-enter" style={{ animationDelay: '0ms' }}>
          <AccountTeamCard account={account} onUpdate={handleTeamUpdate} />
        </div>

        {/* Contrato */}
        <Card className="rounded-2xl card-enter" style={{ animationDelay: '60ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {account.service_name && (
              <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border ${getPlanBadgeStyle(account.service_name)}`}>
                {account.service_name}
              </span>
            )}
            <div>
              <p className="text-[11px] text-muted-foreground uppercase">Valor Mensal</p>
              {showFinancialValues ? (
                <p className="text-2xl font-extrabold font-mono text-foreground">{formatCurrency(account.monthly_value)}</p>
              ) : <RestrictedValue />}
            </div>
            <div className="flex gap-6">
              <div><p className="text-[11px] text-muted-foreground">Data de Entrada</p><p className="text-[13px] text-muted-foreground">{formatDate(account.start_date)}</p></div>
              {account.billing_day && <div><p className="text-[11px] text-muted-foreground">Dia de Vencimento</p><p className="text-[13px] text-muted-foreground">{account.billing_day}</p></div>}
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="rounded-2xl card-enter" style={{ animationDelay: '120ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {account.contact_name && <p className="text-sm font-semibold text-foreground">{account.contact_name}</p>}
            {account.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`tel:${account.contact_phone}`} className="text-[13px] text-muted-foreground hover:underline">{account.contact_phone}</a>
              </div>
            )}
            {account.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`mailto:${account.contact_email}`} className="text-[13px] text-muted-foreground hover:underline">{account.contact_email}</a>
              </div>
            )}
            {account.website && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-primary hover:underline">{account.website}</a>
              </div>
            )}
            {!account.contact_name && !account.contact_phone && !account.contact_email && !account.website && (
              <p className="text-muted-foreground text-sm">Nenhum contato cadastrado</p>
            )}
          </CardContent>
        </Card>

        {/* Entregas do Plano — spans 2 cols */}
        <div className="md:col-span-2">
          <ClientDeliverables serviceId={account.service_id ?? null} />
        </div>

        {/* Tráfego Pago — conditional */}
        {serviceHasTraffic && <ClientTrafficSection account={account} onUpdate={handleTeamUpdate} />}

        {/* Endereço */}
        <Card className="rounded-2xl card-enter" style={{ animationDelay: '180ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getFullAddress() ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[13px] text-muted-foreground">{getFullAddress()}</p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Endereço não cadastrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inteligência do Cliente */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground">Inteligência do Cliente</h2>
        </div>
        <CompletudeBar percent={completude.percent} missing={completude.missing} />
        <div className="grid gap-4 md:grid-cols-3">
          <LinksCard links={clienteLinks} loading={intelLoading} clienteId={id} onSaved={refetchIntel} />
          <ConcorrentesCard concorrentes={concorrentes} loading={intelLoading} clienteId={id} onSaved={refetchIntel} />
          <ArquivosCard anexos={anexos} loading={intelLoading} onDelete={deleteAnexo} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ICPCard inteligencia={inteligencia} arquivos={arquivosIntel} loading={expandedLoading} onSave={upsertInteligencia} onUpload={uploadArquivoInteligencia} onDeleteFile={deleteArquivoInteligencia} />
          <ProdutosCard inteligencia={inteligencia} arquivos={arquivosIntel} loading={expandedLoading} onSave={upsertInteligencia} onUpload={uploadArquivoInteligencia} onDeleteFile={deleteArquivoInteligencia} />
          <InfoGeraisCard inteligencia={inteligencia} arquivos={arquivosIntel} loading={expandedLoading} onSave={upsertInteligencia} onUpload={uploadArquivoInteligencia} onDeleteFile={deleteArquivoInteligencia} />
        </div>
        <AcoesCard acoes={acoes} loading={expandedLoading} onAdd={addAcao} onDelete={deleteAcao} />
      </div>



      {/* Histórico — full width */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3"><Skeleton className="h-3 w-3 rounded-full mt-1.5 shrink-0" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div>
              ))}
            </div>
          ) : historyEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum evento registrado</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {historyEvents.map((event, idx) => (
                  <div key={event.id} className="flex gap-3 relative">
                    <div className={`h-[11px] w-[11px] rounded-full shrink-0 mt-1 z-10 ${EVENT_TYPE_COLORS[event.event_type] || 'bg-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground">{event.description || event.event_type}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-muted-foreground">{formatDateTime(event.created_at)}</span>
                        {event.member_name && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <div className="flex items-center gap-1">
                              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary to-[hsl(var(--destructive))] flex items-center justify-center text-[7px] font-bold text-white">
                                {getInitials(event.member_name)}
                              </div>
                              <span className="text-[11px] text-muted-foreground">{event.member_name}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AccountForm open={accountFormOpen} onClose={() => setAccountFormOpen(false)} onSubmit={handleAccountSubmit} account={account} />
      <ContractForm open={contractFormOpen} onClose={() => { setContractFormOpen(false); setEditingContract(undefined); }} onSubmit={handleContractSubmit} contract={editingContract} accountId={id!} />
      
      <AccountRemoveDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen} account={account} onConfirm={handleRemoveConfirm} />
    </div>
  );
}
