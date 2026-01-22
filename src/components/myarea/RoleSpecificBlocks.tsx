import { useMemo } from 'react';
import { TaskQueue } from './TaskQueue';
import { MyTask } from '@/hooks/useMyTasks';
import { getVisibilityForRoleName, FeatureVisibility } from '@/lib/roleVisibility';

interface RoleSpecificBlocksProps {
  tasks: MyTask[];
  roleName: string | null;
}

export function RoleSpecificBlocks({ tasks, roleName }: RoleSpecificBlocksProps) {
  const visibility = getVisibilityForRoleName(roleName);
  
  // Categorize tasks
  const categorized = useMemo(() => {
    const overdue = tasks.filter(t => t.isOverdue);
    const dueToday = tasks.filter(t => t.isDueToday && !t.isOverdue);
    const upcoming = tasks.filter(t => !t.isOverdue && !t.isDueToday);
    
    // By module
    const content = tasks.filter(t => t.module === 'content');
    const traffic = tasks.filter(t => t.module === 'traffic');
    const cs = tasks.filter(t => t.module === 'cs');
    
    // By source
    const posts = tasks.filter(t => t.source === 'content_posts');
    const extras = tasks.filter(t => t.source === 'content_extra_requests');
    const creatives = tasks.filter(t => t.source === 'traffic_creative_requests');
    const trafficTasks = tasks.filter(t => t.source === 'traffic_tasks');
    const onboarding = tasks.filter(t => t.source === 'cs_client_onboarding_tasks');
    const meetings = tasks.filter(t => t.source === 'cs_meeting_actions');
    const risk = tasks.filter(t => t.source === 'cs_risk_action_items');
    
    return {
      overdue,
      dueToday,
      upcoming,
      content,
      traffic,
      cs,
      posts,
      extras,
      creatives,
      trafficTasks,
      onboarding,
      meetings,
      risk,
    };
  }, [tasks]);

  // Determine which blocks to show based on role
  const isDesignerOrVideomaker = 
    roleName?.toLowerCase().includes('designer') || 
    roleName?.toLowerCase().includes('video');
  
  const isSocial = roleName?.toLowerCase().includes('social');
  const isTraffic = 
    roleName?.toLowerCase().includes('tráfego') || 
    roleName?.toLowerCase().includes('traffic');
  const isCS = 
    roleName?.toLowerCase().includes('cs') || 
    roleName?.toLowerCase().includes('sucesso');
  const isSupport = 
    roleName?.toLowerCase().includes('atendimento') || 
    roleName?.toLowerCase().includes('suporte');
  
  // Default to showing module-based blocks if no specific role match
  const showGenericBlocks = !isDesignerOrVideomaker && !isSocial && !isTraffic && !isCS && !isSupport;

  return (
    <div className="space-y-6">
      {/* Always show overdue if any */}
      {categorized.overdue.length > 0 && (
        <TaskQueue
          tasks={categorized.overdue}
          title="🚨 Atrasadas"
          maxItems={10}
        />
      )}

      {/* Designer/Videomaker blocks */}
      {isDesignerOrVideomaker && (
        <>
          <TaskQueue
            tasks={[...categorized.posts, ...categorized.creatives].sort((a, b) => {
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            })}
            title="Fila de Produção"
            emptyMessage="Nenhuma produção pendente."
            maxItems={8}
          />
        </>
      )}

      {/* Social Media blocks */}
      {isSocial && (
        <>
          <TaskQueue
            tasks={categorized.posts}
            title="Posts em Andamento"
            emptyMessage="Nenhum post pendente."
            maxItems={8}
          />
          {categorized.extras.length > 0 && (
            <TaskQueue
              tasks={categorized.extras}
              title="Solicitações Extras"
              emptyMessage="Nenhuma solicitação pendente."
              maxItems={5}
            />
          )}
        </>
      )}

      {/* Traffic Manager blocks */}
      {isTraffic && (
        <>
          <TaskQueue
            tasks={categorized.dueToday.filter(t => t.module === 'traffic')}
            title="Tarefas de Tráfego Hoje"
            emptyMessage="Nenhuma tarefa para hoje."
            maxItems={8}
          />
          {categorized.creatives.length > 0 && (
            <TaskQueue
              tasks={categorized.creatives}
              title="Solicitações de Criativo"
              emptyMessage="Nenhuma solicitação aberta."
              maxItems={5}
            />
          )}
        </>
      )}

      {/* CS blocks */}
      {isCS && (
        <>
          {categorized.onboarding.length > 0 && (
            <TaskQueue
              tasks={categorized.onboarding}
              title="Tarefas de Onboarding"
              emptyMessage="Nenhuma tarefa pendente."
              maxItems={8}
            />
          )}
          {categorized.meetings.length > 0 && (
            <TaskQueue
              tasks={categorized.meetings}
              title="Ações de Reuniões"
              emptyMessage="Nenhuma ação pendente."
              maxItems={5}
            />
          )}
          {categorized.risk.length > 0 && (
            <TaskQueue
              tasks={categorized.risk}
              title="Ações de Risco"
              emptyMessage="Nenhuma ação pendente."
              maxItems={5}
            />
          )}
        </>
      )}

      {/* Support/Atendimento blocks */}
      {isSupport && (
        <>
          <TaskQueue
            tasks={categorized.extras}
            title="Solicitações Extras"
            emptyMessage="Nenhuma solicitação pendente."
            maxItems={8}
          />
          {categorized.onboarding.length > 0 && (
            <TaskQueue
              tasks={categorized.onboarding}
              title="Tarefas de Onboarding"
              emptyMessage="Nenhuma tarefa pendente."
              maxItems={5}
            />
          )}
        </>
      )}

      {/* Generic blocks for admin or unknown roles */}
      {showGenericBlocks && (
        <>
          {categorized.dueToday.length > 0 && (
            <TaskQueue
              tasks={categorized.dueToday}
              title="Para Hoje"
              maxItems={8}
            />
          )}
          {categorized.upcoming.length > 0 && (
            <TaskQueue
              tasks={categorized.upcoming}
              title="Próximas Tarefas"
              maxItems={8}
            />
          )}
        </>
      )}
    </div>
  );
}
