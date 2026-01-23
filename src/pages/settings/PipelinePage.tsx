import { Loader2, GitBranch, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useStageResponsibilities } from '@/hooks/useStageResponsibilities';
import { BATCH_STATUS_OPTIONS } from '@/types/contentProduction';
import { ROLE_OPTIONS, RoleKey } from '@/lib/accountTeam';

const VARIABLE_STAGES = ['production', 'changes'];

export default function PipelinePage() {
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="h-6 w-6" />
          Pipeline de Produção
        </h1>
        <p className="text-muted-foreground">
          Responsáveis por cada etapa do fluxo de conteúdo. 
          O Responsável (usuário) é atribuído automaticamente pelo Time da Conta do cliente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cargo Responsável por Etapa</CardTitle>
          <CardDescription>
            Para "Produção" e "Alteração", o cargo é determinado pelo formato do conteúdo (Designer para imagens, Videomaker para vídeos).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {BATCH_STATUS_OPTIONS.map((stage) => {
            const isVariable = VARIABLE_STAGES.includes(stage.value);
            const currentRoleKey = getRoleKeyForStage(stage.value);

            return (
              <div key={stage.value} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{stage.label}</span>
                  {isVariable && (
                    <Badge variant="secondary" className="text-xs">
                      <Info className="h-3 w-3 mr-1" />
                      Por Formato
                    </Badge>
                  )}
                </div>
                {isVariable ? (
                  <span className="text-sm text-muted-foreground">
                    Automático: Designer (design) / Videomaker (vídeo)
                  </span>
                ) : (
                  <Select
                    value={currentRoleKey || '_none_'}
                    onValueChange={(v) => handleRoleChange(stage.value, v)}
                  >
                    <SelectTrigger className="w-48 bg-background">
                      <SelectValue placeholder="Selecionar cargo" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="_none_">Sem responsável</SelectItem>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
