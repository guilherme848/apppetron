import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number | ReactNode;
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <Card className="kpi-card card-enter">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="text-2xl font-bold font-mono stat-value">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
