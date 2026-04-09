import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number | ReactNode;
  icon: LucideIcon;
  description?: string;
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'purple';
}

const accentColors: Record<string, string> = {
  primary: 'bg-primary/[0.12] text-primary',
  success: 'bg-success/[0.12] text-success',
  warning: 'bg-warning/[0.12] text-warning',
  destructive: 'bg-destructive/[0.12] text-destructive',
  info: 'bg-info/[0.12] text-info',
  purple: 'bg-purple/[0.12] text-purple',
};

export function StatsCard({ title, value, icon: Icon, description, accent = 'primary' }: StatsCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5 transition-[border-color] duration-150 hover:border-primary/40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </span>
        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${accentColors[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-[32px] font-extrabold font-mono leading-tight">{value}</div>
      {description && (
        <p className="text-[13px] text-muted-foreground mt-1.5">{description}</p>
      )}
    </div>
  );
}
