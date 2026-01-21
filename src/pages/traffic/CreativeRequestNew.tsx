import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useCreativeRequests } from '@/hooks/useCreativeRequests';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCurrentMember } from '@/hooks/usePermissions';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import { resolveAssigneeFromAccountTeam, ROLE_OPTIONS, ROLE_KEY_LABELS, RoleKey } from '@/lib/accountTeam';
import {
  CREATIVE_REQUEST_PRIORITY_OPTIONS,
  CREATIVE_REQUEST_FORMAT_OPTIONS,
  CREATIVE_REQUEST_OBJECTIVE_OPTIONS,
  CreativeRequestPriority,
  CreativeRequestFormat,
  CreativeRequestObjective,
  CreativeResponsibleRole,
} from '@/types/creativeRequests';

export default function CreativeRequestNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addRequest } = useCreativeRequests();
  const { accounts } = useCrmData();
  const { members } = useTeamMembers();
  const { currentMemberId } = useCurrentMember();

  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [briefTitle, setBriefTitle] = useState('');
  const [briefRich, setBriefRich] = useState('');
  const [format, setFormat] = useState<CreativeRequestFormat>('static');
  const [objective, setObjective] = useState<CreativeRequestObjective | ''>('');
  const [priority, setPriority] = useState<CreativeRequestPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [responsibleRoleKey, setResponsibleRoleKey] = useState<RoleKey>('designer');
  const [reviewerId, setReviewerId] = useState<string>('');

  // Get selected account
  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === clientId) || null
  , [accounts, clientId]);

  // Auto-resolve assignee based on role and account team
  const resolvedAssigneeId = useMemo(() => 
    resolveAssigneeFromAccountTeam(selectedAccount, responsibleRoleKey)
  , [selectedAccount, responsibleRoleKey]);

  // Get assignee name for display
  const assigneeName = useMemo(() => {
    if (!resolvedAssigneeId) return null;
    return members.find(m => m.id === resolvedAssigneeId)?.name || null;
  }, [resolvedAssigneeId, members]);

  // Check if role is missing from account team
  const isRoleMissing = clientId && responsibleRoleKey && !resolvedAssigneeId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId || !title || !responsibleRoleKey) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    if (!resolvedAssigneeId) {
      toast({ 
        title: 'Erro', 
        description: `Defina o responsável do cargo "${ROLE_KEY_LABELS[responsibleRoleKey]}" no Time da Conta do cliente.`, 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    const result = await addRequest({
      client_id: clientId,
      title,
      brief_title: briefTitle || null,
      brief_rich: briefRich || null,
      format,
      objective: objective || null,
      priority,
      due_date: dueDate || null,
      requested_by_member_id: currentMemberId || null,
      responsible_role_key: responsibleRoleKey as CreativeResponsibleRole,
      assignee_id: resolvedAssigneeId, // Will be overridden by trigger anyway
      reviewer_member_id: reviewerId || null,
    });

    setSaving(false);
    if (result.success) {
      toast({ title: 'Sucesso', description: 'Solicitação criada' });
      navigate(`/traffic/creatives/${result.data?.id}`);
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const activeMembers = members.filter((m) => m.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/traffic/creatives')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nova Solicitação de Criativo</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Solicitação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Criativo para campanha de leads"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Formato *</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as CreativeRequestFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATIVE_REQUEST_FORMAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select value={objective || 'none'} onValueChange={(v) => setObjective(v === 'none' ? '' : v as CreativeRequestObjective)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {CREATIVE_REQUEST_OBJECTIVE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título do Briefing</Label>
              <Input
                value={briefTitle}
                onChange={(e) => setBriefTitle(e.target.value)}
                placeholder="Título ou resumo do briefing"
              />
            </div>

            <div className="space-y-2">
              <Label>Briefing / Descrição</Label>
              <RichTextEditor
                content={briefRich}
                onChange={setBriefRich}
                placeholder="Descreva o criativo desejado..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cargo Responsável *</Label>
                <Select 
                  value={responsibleRoleKey} 
                  onValueChange={(v) => setResponsibleRoleKey(v as RoleKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável (atribuição automática)</Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50 min-h-[40px]">
                  <span className="text-sm">
                    {assigneeName || (clientId ? 'Não definido no Time da Conta' : 'Selecione um cliente')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  O responsável é atribuído automaticamente pelo Time da Conta do cliente.
                </p>
              </div>
            </div>

            {isRoleMissing && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span>
                    O cargo "{ROLE_KEY_LABELS[responsibleRoleKey]}" não está definido no Time da Conta do cliente. 
                    Defina o responsável para criar esta solicitação.
                  </span>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/crm/${clientId}?tab=team`)}
                    className="whitespace-nowrap"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Definir Time
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Prazo</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as CreativeRequestPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATIVE_REQUEST_PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Revisor</Label>
                <Select 
                  value={reviewerId || 'none'} 
                  onValueChange={(v) => setReviewerId(v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {activeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/traffic/creatives')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || isRoleMissing}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Criar Solicitação
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
