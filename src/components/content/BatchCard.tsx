import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, Plus } from 'lucide-react';
import { ContentBatch, BATCH_STATUS_OPTIONS, BatchStatus } from '@/types/contentProduction';

interface BatchCardProps {
  batch: ContentBatch;
  clientName: string;
  postCount: number;
  onView: (id: string) => void;
  onStatusChange: (id: string, status: BatchStatus) => void;
  onAddPost: (batchId: string) => void;
}

export function BatchCard({ batch, clientName, postCount, onView, onStatusChange, onAddPost }: BatchCardProps) {
  const formatMonthRef = (monthRef: string) => {
    const [year, month] = monthRef.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{clientName}</CardTitle>
            <p className="text-sm text-muted-foreground">{formatMonthRef(batch.month_ref)}</p>
          </div>
          <Badge variant="secondary">{postCount} posts</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={batch.status}
          onValueChange={(value) => onStatusChange(batch.id, value as BatchStatus)}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {BATCH_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(batch.id)}>
            <Eye className="h-4 w-4 mr-1" />
            Abrir
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddPost(batch.id)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
