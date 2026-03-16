import { FileText, MessageSquare, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  transcriptionCount: number;
  answeredCount: number;
  totalQuestions: number;
  completedActivities: number;
  totalActivities: number;
}

function ProgressBadge({ value, total, type }: { value: number; total: number; type: 'transcription' | 'answers' | 'activities' }) {
  let colorClass = '';
  if (type === 'transcription') {
    colorClass = value >= 2 ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]' : value >= 1 ? 'bg-[hsl(45,93%,47%,0.12)] text-[hsl(45,93%,47%)]' : 'bg-destructive/10 text-destructive';
  } else if (type === 'answers') {
    colorClass = total > 0 && value === total ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]' : value > 0 ? 'bg-[hsl(45,93%,47%,0.12)] text-[hsl(45,93%,47%)]' : 'bg-destructive/10 text-destructive';
  } else {
    colorClass = total > 0 && value === total ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]' : value > 0 ? 'bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]' : 'bg-muted text-muted-foreground';
  }

  const label = type === 'transcription' ? `${value}/2 anexadas` : type === 'answers' ? `${value}/${total} respondidas` : `${value}/${total} concluídas`;

  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', colorClass)}>
      {label}
    </span>
  );
}

const tabs = [
  { key: 'transcricoes', label: 'Transcrições', icon: FileText, type: 'transcription' as const },
  { key: 'reuniao', label: 'Reunião de Onboarding', icon: MessageSquare, type: 'answers' as const },
  { key: 'atividades', label: 'Atividades', icon: CheckSquare, type: 'activities' as const },
];

export default function StickyNav({ activeTab, onTabChange, transcriptionCount, answeredCount, totalQuestions, completedActivities, totalActivities }: StickyNavProps) {
  const getProgress = (type: 'transcription' | 'answers' | 'activities') => {
    if (type === 'transcription') return { value: transcriptionCount, total: 2 };
    if (type === 'answers') return { value: answeredCount, total: totalQuestions };
    return { value: completedActivities, total: totalActivities };
  };

  return (
    <div className="sticky top-[60px] z-30 bg-card/80 backdrop-blur-xl border-b border-border/50 -mx-4 px-8 md:-mx-6 md:px-10">
      <div className="flex items-center gap-1 h-12">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const progress = getProgress(tab.type);
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 h-full text-sm transition-all duration-150 relative',
                isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <ProgressBadge value={progress.value} total={progress.total} type={tab.type} />
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, #F97316, #f43f5e)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
