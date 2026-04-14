import { Construction, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  title: string;
  description: string;
  features?: string[];
  tableName?: string;
}

export default function SettingsComingSoon({ title, description, features, tableName }: Props) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-500/10 p-4">
              <Construction className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <div>
            <Badge variant="outline" className="mb-2">Em desenvolvimento</Badge>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          </div>

          {features && features.length > 0 && (
            <div className="text-left bg-muted/30 rounded-md p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">O que terá aqui:</p>
              <ul className="space-y-1.5">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tableName && (
            <p className="text-[10px] text-muted-foreground">
              Dados já existem no banco em <code className="bg-muted px-1 rounded">{tableName}</code>. Aguardando interface.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
