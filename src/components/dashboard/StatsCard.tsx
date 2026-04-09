import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number | ReactNode;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; label?: string };
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'purple';
}

const accentMap = {
  primary: {
    iconBg: 'bg-gradient-to-br from-primary/20 to-primary/5',
    iconColor: 'text-primary',
    glow: 'group-hover:shadow-primary/15',
    border: 'group-hover:border-primary/40',
  },
  success: {
    iconBg: 'bg-gradient-to-br from-success/20 to-success/5',
    iconColor: 'text-success',
    glow: 'group-hover:shadow-success/15',
    border: 'group-hover:border-success/40',
  },
  warning: {
    iconBg: 'bg-gradient-to-br from-warning/20 to-warning/5',
    iconColor: 'text-warning',
    glow: 'group-hover:shadow-warning/15',
    border: 'group-hover:border-warning/40',
  },
  destructive: {
    iconBg: 'bg-gradient-to-br from-destructive/20 to-destructive/5',
    iconColor: 'text-destructive',
    glow: 'group-hover:shadow-destructive/15',
    border: 'group-hover:border-destructive/40',
  },
  info: {
    iconBg: 'bg-gradient-to-br from-info/20 to-info/5',
    iconColor: 'text-info',
    glow: 'group-hover:shadow-info/15',
    border: 'group-hover:border-info/40',
  },
  purple: {
    iconBg: 'bg-gradient-to-br from-purple/20 to-purple/5',
    iconColor: 'text-purple',
    glow: 'group-hover:shadow-purple/15',
    border: 'group-hover:border-purple/40',
  },
};

export function StatsCard({ title, value, icon: Icon, description, trend, accent = 'primary' }: StatsCardProps) {
  const colors = accentMap[accent];

  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ${colors.border} cursor-default`}>
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            {title}
          </span>
          <div className={`h-10 w-10 rounded-xl ${colors.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`h-5 w-5 ${colors.iconColor}`} />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="text-3xl font-bold tracking-tight stat-value">{value}</div>
          {trend && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${
              trend.value >= 0
                ? 'text-success bg-success/10'
                : 'text-destructive bg-destructive/10'
            }`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}
