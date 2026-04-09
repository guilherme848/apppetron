import { FileText, MessageSquare, CheckSquare, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  transcriptionCount: number;
  answeredCount: number;
  totalQuestions: number;
  completedActivities: number;
  totalActivities: number;
  checkupFilled: number;
  checkupClassificacao: string | null;
}

function ProgressBadge({ value, total, type, classificacao }: { value: number; total: number; type: 'transcription' | 'answers' | 'activities' | 'checkup'; classificacao?: string | null }) {
  let bgClass = '';
  let textClass = '';
  let borderClass = '';

  if (type === 'checkup') {
    if (classificacao) {
      const colorMap: Record<string, { bg: string; text: string; border: string }> = {
        A: { bg: 'bg-[hsl(var(--success)/0.12)]', text: 'text-[hsl(var(--success))]', border: 'border-[hsl(var(--success)/0.25)]' },
        B: { bg: 'bg-[hsl(258,90%,66%,0.12)]', text: 'text-[hsl(258,90%,66%)]', border: 'border-[hsl(258,90%,66%,0.25)]' },
        C: { bg: 'bg-[hsl(var(--warning)/0.12)]', text: 'text-[hsl(var(--warning))]', border: 'border-[hsl(var(--warning)/0.25)]' },
        D: { bg: 'bg-destructive/12', text: 'text-destructive', border: 'border-destructive/25' },
      };
      const c = colorMap[classificacao] || colorMap.D;
      bgClass = c.bg; textClass = c.text; borderClass = c.border;
    } else if (value > 0) {
      bgClass = 'bg-[hsl(var(--warning)/0.12)]';
      textClass = 'text-[hsl(var(--warning))]';
      borderClass = 'border-[hsl(var(--warning)/0.25)]';
    } else {
      bgClass = 'bg-muted';
      textClass = 'text-muted-foreground';
      borderClass = 'border-border';
    }
    const label = classificacao ? `Perfil ${classificacao}` : value > 0 ? `${value}/7 respondidas` : 'Pendente';
    return (
      <span className={cn('text-[10px] font-semibold px-[7px] py-[2px] rounded-[10px] border', bgClass, textClass, borderClass)}>
        {label}
      </span>
    );
  }

  if (type === 'transcription') {
    if (value >= 2) {
      bgClass = 'bg-[hsl(var(--success)/0.12)]';
      textClass = 'text-[hsl(var(--success))]';
      borderClass = 'border-[hsl(var(--success)/0.25)]';
    } else if (value >= 1) {
      bgClass = 'bg-[hsl(var(--warning)/0.12)]';
      textClass = 'text-[hsl(var(--warning))]';
      borderClass = 'border-[hsl(var(--warning)/0.25)]';
    } else {
      bgClass = 'bg-destructive/12';
      textClass = 'text-destructive';
      borderClass = 'border-destructive/25';
    }
  } else if (type === 'answers') {
    if (total > 0 && value === total) {
      bgClass = 'bg-[hsl(var(--success)/0.12)]';
      textClass = 'text-[hsl(var(--success))]';
      borderClass = 'border-[hsl(var(--success)/0.25)]';
    } else if (value > 0) {
      bgClass = 'bg-[hsl(var(--warning)/0.12)]';
      textClass = 'text-[hsl(var(--warning))]';
      borderClass = 'border-[hsl(var(--warning)/0.25)]';
    } else {
      bgClass = 'bg-destructive/12';
      textClass = 'text-destructive';
      borderClass = 'border-destructive/25';
    }
  } else {
    if (total > 0 && value === total) {
      bgClass = 'bg-[hsl(var(--success)/0.12)]';
      textClass = 'text-[hsl(var(--success))]';
      borderClass = 'border-[hsl(var(--success)/0.25)]';
    } else if (value > 0) {
      bgClass = 'bg-primary/12';
      textClass = 'text-primary';
      borderClass = 'border-primary/25';
    } else {
      bgClass = 'bg-muted';
      textClass = 'text-muted-foreground';
      borderClass = 'border-border';
    }
  }

  const label = type === 'transcription'
    ? `${value}/2 anexadas`
    : type === 'answers'
      ? `${value}/${total} respondidas`
      : `${value}/${total} concluídas`;

  return (
    <span className={cn(
      'text-[10px] font-semibold px-[7px] py-[2px] rounded-[10px] border',
      bgClass, textClass, borderClass
    )}>
      {label}
    </span>
  );
}

const tabs = [
  { key: 'transcricoes', label: 'Transcrições', icon: FileText, type: 'transcription' as const },
  { key: 'reuniao', label: 'Reunião de Onboarding', icon: MessageSquare, type: 'answers' as const },
  { key: 'atividades', label: 'Atividades', icon: CheckSquare, type: 'activities' as const },
  { key: 'checkup', label: 'Checkup do Cliente', icon: ClipboardCheck, type: 'checkup' as const },
];

export default function StickyNav({ activeTab, onTabChange, transcriptionCount, answeredCount, totalQuestions, completedActivities, totalActivities, checkupFilled, checkupClassificacao }: StickyNavProps) {
  const getProgress = (type: 'transcription' | 'answers' | 'activities' | 'checkup') => {
    if (type === 'transcription') return { value: transcriptionCount, total: 2 };
    if (type === 'answers') return { value: answeredCount, total: totalQuestions };
    if (type === 'checkup') return { value: checkupFilled, total: 7 };
    return { value: completedActivities, total: totalActivities };
  };

  return (
    <div className="sticky top-[60px] z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 -mx-4 px-8 md:-mx-6 md:px-10">
      <div className="flex items-center gap-1 h-12">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const progress = getProgress(tab.type);
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 h-full text-sm transition-all duration-150 relative rounded-lg',
                isActive
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <ProgressBadge value={progress.value} total={progress.total} type={tab.type} classificacao={tab.type === 'checkup' ? checkupClassificacao : undefined} />
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #F4762D, #2B5B6C)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
