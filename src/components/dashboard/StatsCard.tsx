import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number | ReactNode;
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <div className="rounded-2xl border bg-card p-5 transition-[border-color] duration-150 hover:border-primary/40">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </span>
        <div className="h-9 w-9 rounded-full flex items-center justify-center bg-primary/[0.12]">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="text-[32px] font-extrabold font-mono leading-tight">{value}</div>
      {description && (
        <p className="text-[13px] text-muted-foreground mt-1.5">{description}</p>
      )}
    </div>
  );
}
