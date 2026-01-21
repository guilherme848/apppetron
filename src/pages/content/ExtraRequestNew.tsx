import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useExtraRequests } from '@/hooks/useExtraRequests';
import { useCrmData } from '@/hooks/useCrmData';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useCurrentMember } from '@/hooks/usePermissions';
import { RichTextEditor } from '@/components/content/RichTextEditor';
import {
  EXTRA_REQUEST_PRIORITY_LABELS,
  EXTRA_REQUESTED_BY_ROLE_LABELS,
  EXTRA_RESPONSIBLE_ROLE_LABELS,
  ExtraRequestPriority,
  ExtraRequestedByRole,
  ExtraResponsibleRole,
  ROLE_KEY_TO_ACCOUNT_FIELD,
} from '@/types/extraRequests';

export default function ExtraRequestNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addRequest } = useExtraRequests();
  const { accounts } = useCrmData();
  const { members } = useTeamMembers();
  const { currentMemberId } = useCurrentMember();

  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [requestRich, setRequestRich] = useState('');
  const [requestedByRoleKey, setRequestedByRoleKey] = useState<ExtraRequestedByRole>('support');
  const [requestedByMemberId, setRequestedByMemberId] = useState<string>('');
  const [responsibleRoleKey, setResponsibleRoleKey] = useState<ExtraResponsibleRole | ''>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<ExtraRequestPriority>('medium');

  // Auto-fill requested_by_member_id with current user
  useEffect(() => {
    if (currentMemberId && !requestedByMemberId) {
      setRequestedByMemberId(currentMemberId);
    }
  }, [currentMemberId, requestedByMemberId]);

  // Auto-assign when responsible_role_key changes
  useEffect(() => {
    if (responsibleRoleKey && clientId) {
      const account = accounts.find(a => a.id === clientId);
      if (account) {
        const field = ROLE_KEY_TO_ACCOUNT_FIELD[responsibleRoleKey];
        const memberId = (account as any)[field];
        if (memberId) {
          setAssigneeId(memberId);
        }
      }
    }
  }, [responsibleRoleKey, clientId, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !title || !requestedByRoleKey) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const result = await addRequest({
      client_id: clientId,
      month_ref: '', // Will be set by hook
      title,
      request_rich: requestRich || null,
      status: 'open',
      priority,
      requested_by_member_id: requestedByMemberId || null,
      requested_by_role_key: requestedByRoleKey,
      responsible_role_key: responsibleRoleKey || null,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
    });

    setSaving(false);
    if (result.success) {
      toast({ title: 'Sucesso', description: 'Solicitação criada' });
      navigate(`/content/extra-requests/${result.data?.id}`);
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    }
  };

  const activeAccounts = accounts.filter(a => a.status === 'active');
  const activeMembers = members.filter(m => m.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/content/extra-requests')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nova Solicitação Extra</h1>
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
                    {activeAccounts.map(a => (
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
                  placeholder="Título da solicitação"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pedido / Descrição</Label>
              <RichTextEditor
                content={requestRich}
                onChange={setRequestRich}
                placeholder="Descreva a solicitação..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Solicitado por (Tipo) *</Label>
                <Select value={requestedByRoleKey} onValueChange={(v) => setRequestedByRoleKey(v as ExtraRequestedByRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXTRA_REQUESTED_BY_ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Solicitado por (Usuário)</Label>
                <Select value={requestedByMemberId} onValueChange={setRequestedByMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {activeMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cargo Responsável</Label>
                <Select value={responsibleRoleKey} onValueChange={(v) => setResponsibleRoleKey(v as ExtraResponsibleRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {Object.entries(EXTRA_RESPONSIBLE_ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {activeMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                <Select value={priority} onValueChange={(v) => setPriority(v as ExtraRequestPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXTRA_REQUEST_PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/content/extra-requests')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
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
