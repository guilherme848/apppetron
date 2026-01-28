import React, { ReactNode } from 'react';
import GridLayout, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { Loader2, GripVertical, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const ResponsiveGridLayout = WidthProvider(GridLayout);

interface DashboardItem {
  key: string;
  component: ReactNode;
}

interface DraggableDashboardProps {
  items: DashboardItem[];
  className?: string;
}

export function DraggableDashboard({ items, className }: DraggableDashboardProps) {
  const { layout, loading, saving, handleLayoutChange } = useDashboardLayout();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Saving indicator */}
      {saving && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">
          <Save className="h-3 w-3 animate-pulse" />
          Salvando...
        </div>
      )}

      <ResponsiveGridLayout
        className="dashboard-grid"
        layout={layout}
        cols={4}
        rowHeight={100}
        onLayoutChange={handleLayoutChange}
        isDraggable
        isResizable
        draggableHandle=".drag-handle"
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms
      >
        {items.map((item) => (
          <div key={item.key} className="dashboard-item group">
            <div className="drag-handle absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-move p-1 rounded bg-muted/50 hover:bg-muted">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-full w-full overflow-auto">{item.component}</div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
