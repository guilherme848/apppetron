import { useState, useMemo } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCsRiskCases } from '@/hooks/useCsData';
import { useCrmData } from '@/hooks/useCrmData';
import { CS_RISK_LEVEL_LABELS, CS_RISK_STATUS_LABELS, CS_RISK_REASON_LABELS, type CsRiskLevel, type CsRiskReason } from '@/types/cs';
import { toast } from 'sonner';

export default function CsRisk() {
  const { cases, loading, addCase } = useCsRiskCases();
  const { accounts, loading: accountsLoading } = useCrmData();
  const activeClients = useMemo(() => accounts.filter(a => a.status === 'active'), [accounts]);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: '',
    level: '' as CsRiskLevel | '',
    reason: '' as CsRiskReason | '',
    details_rich: '',
  });

  const resetForm = () => {
    setForm({ client_id: '', level: '', reason: '', details_rich: '' });
  };

  const handleSave = async () => {
    if (!form.client_id || !form.level || !form.reason) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    const result = await addCase({
      client_id: form.client_id,
      level: form.level as CsRiskLevel,
      reason: form.reason as CsRiskReason,
      details_rich: form.details_rich || null,
      status: 'open',
      owner_member_id: null,
      due_at: null,
    } as any);
    setSaving(false);
    if (result.success) {
      toast.success('Caso de risco criado');
      setShowNewDialog(false);
      resetForm();
    } else {
      toast.error('Erro ao criar caso de risco');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'moderate': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Risco & Cancelamento</h1>
            <p className="text-muted-foreground">Gerenciamento de clientes em risco</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowNewDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Caso de Risco
        </Button>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum caso de risco registrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((riskCase) => (
            <Card key={riskCase.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{riskCase.client_name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={getLevelColor(riskCase.level)}>
                      {CS_RISK_LEVEL_LABELS[riskCase.level]}
                    </Badge>
                    <Badge variant="outline">
                      {CS_RISK_STATUS_LABELS[riskCase.status]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Motivo: {CS_RISK_REASON_LABELS[riskCase.reason]}
                </p>
                {riskCase.owner_member_name && (
                  <p className="text-sm text-muted-foreground">
                    Responsável: {riskCase.owner_member_name}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Risk Case Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Caso de Risco</DialogTitle>
            <DialogDescription>Registre um novo caso de risco para acompanhamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {activeClients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nível *</Label>
              <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v as CsRiskLevel }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(CS_RISK_LEVEL_LABELS) as [CsRiskLevel, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo *</Label>
              <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v as CsRiskReason }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(CS_RISK_REASON_LABELS) as [CsRiskReason, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva os detalhes do caso de risco..."
                value={form.details_rich}
                onChange={e => setForm(f => ({ ...f, details_rich: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.client_id || !form.level || !form.reason}>
              {saving ? 'Salvando...' : 'Criar Caso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
