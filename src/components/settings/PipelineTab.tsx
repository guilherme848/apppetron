import { Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useJobRoles } from '@/hooks/useJobRoles';
import { useStageResponsibilities } from '@/hooks/useStageResponsibilities';
import { BATCH_STATUS_OPTIONS } from '@/types/contentProduction';

const VARIABLE_STAGES = ['production', 'changes'];

export function PipelineTab() {
  const { roles, loading: loadingRoles } = useJobRoles();
  const { responsibilities, loading: loadingResp, updateResponsibility } = useStageResponsibilities();

  const handleRoleChange = async (stageKey: string, roleId: string) => {
    const value = roleId === '_none_' ? null : roleId;
    const { error } = await updateResponsibility(stageKey, value);
    if (error) {
      toast.error('Erro ao atualizar responsável');
    } else {
      toast.success('Responsável atualizado');
    }
  };

  const getRoleForStage = (stageKey: string) => {
    const resp = responsibilities.find((r) => r.stage_key === stageKey);
    return resp?.role_id || null;
  };

  if (loadingRoles || loadingResp) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pipeline de Produção</CardTitle>
        <CardDescription>Defina o cargo responsável por cada etapa do fluxo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {BATCH_STATUS_OPTIONS.map((stage) => {
          const isVariable = VARIABLE_STAGES.includes(stage.value);
          const currentRoleId = getRoleForStage(stage.value);

          return (
            <div key={stage.value} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{stage.label}</span>
                {isVariable && (
                  <Badge variant="secondary" className="text-xs">
                    <Info className="h-3 w-3 mr-1" />
                    Variável
                  </Badge>
                )}
              </div>
              {isVariable ? (
                <span className="text-xs text-muted-foreground">Designer/Videomaker</span>
              ) : (
                <Select
                  value={currentRoleId || '_none_'}
                  onValueChange={(v) => handleRoleChange(stage.value, v)}
                >
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Sem responsável</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
