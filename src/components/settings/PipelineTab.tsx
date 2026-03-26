import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useStageResponsibilities } from '@/hooks/useStageResponsibilities';
import { BATCH_STATUS_OPTIONS } from '@/types/contentProduction';
import { ROLE_OPTIONS, RoleKey } from '@/lib/accountTeam';
import { Skeleton } from '@/components/ui/skeleton';

// Stages where assignment is by format (designer/videomaker), not configurable
const VARIABLE_STAGES = ['production', 'changes'];

export function PipelineTab() {
  const { responsibilities, loading: loadingResp, updateResponsibility, getRoleKeyForStage } = useStageResponsibilities();

  const handleRoleChange = async (stageKey: string, roleKey: string) => {
    const value = roleKey === '_none_' ? null : (roleKey as RoleKey);
    const { error } = await updateResponsibility(stageKey, value);
    if (error) {
      toast.error('Erro ao atualizar responsável');
    } else {
      toast.success('Responsável atualizado');
    }
  };

  if (loadingResp) {
    return (
      <div className="flex items-center justify-center h-32">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pipeline de Produção</CardTitle>
        <CardDescription>
          Defina o cargo responsável padrão por cada etapa do fluxo. 
          O Responsável (usuário) é atribuído automaticamente pelo Time da Conta do cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {BATCH_STATUS_OPTIONS.map((stage) => {
          const isVariable = VARIABLE_STAGES.includes(stage.value);
          const currentRoleKey = getRoleKeyForStage(stage.value);

          return (
            <div key={stage.value} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{stage.label}</span>
                {isVariable && (
                  <Badge variant="secondary" className="text-xs">
                    <Info className="h-3 w-3 mr-1" />
                    Por Formato
                  </Badge>
                )}
              </div>
              {isVariable ? (
                <span className="text-xs text-muted-foreground">Automático: Designer/Videomaker</span>
              ) : (
                <Select
                  value={currentRoleKey || '_none_'}
                  onValueChange={(v) => handleRoleChange(stage.value, v)}
                >
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Sem responsável</SelectItem>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
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
