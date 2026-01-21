import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
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
import {
  CREATIVE_REQUEST_PRIORITY_OPTIONS,
  CREATIVE_REQUEST_FORMAT_OPTIONS,
  CREATIVE_REQUEST_OBJECTIVE_OPTIONS,
  CREATIVE_RESPONSIBLE_ROLE_OPTIONS,
  CREATIVE_ROLE_KEY_TO_ACCOUNT_FIELD,
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
  const [responsibleRoleKey, setResponsibleRoleKey] = useState<CreativeResponsibleRole | ''>('designer');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [reviewerId, setReviewerId] = useState<string>('');
  const [autoAssignWarning, setAutoAssignWarning] = useState<string>('');

  // Auto-assign based on responsible_role_key and client
  useEffect(() => {
    if (responsibleRoleKey && clientId) {
      const account = accounts.find((a) => a.id === clientId);
      if (account) {
        const field = CREATIVE_ROLE_KEY_TO_ACCOUNT_FIELD[responsibleRoleKey];
        const memberId = (account as any)[field];
        if (memberId) {
          setAssigneeId(memberId);
          setAutoAssignWarning('');
        } else {
          setAssigneeId('');
          setAutoAssignWarning(`O cliente não possui ${CREATIVE_RESPONSIBLE_ROLE_OPTIONS.find(o => o.value === responsibleRoleKey)?.label} definido. Defina o Time da Conta para autoatribuição.`);
        }
      }
    } else {
      setAutoAssignWarning('');
    }
  }, [responsibleRoleKey, clientId, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !title) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
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
      responsible_role_key: responsibleRoleKey || null,
      assignee_id: assigneeId || null,
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
                <Label>Cargo Responsável</Label>
                <Select 
                  value={responsibleRoleKey || 'none'} 
                  onValueChange={(v) => setResponsibleRoleKey(v === 'none' ? '' : v as CreativeResponsibleRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {CREATIVE_RESPONSIBLE_ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select 
                  value={assigneeId || 'none'} 
                  onValueChange={(v) => setAssigneeId(v === 'none' ? '' : v)}
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

            {autoAssignWarning && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{autoAssignWarning}</AlertDescription>
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
