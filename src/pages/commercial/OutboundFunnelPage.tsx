import SalesFunnelPage from '@/pages/commercial/SalesFunnelPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Construction } from 'lucide-react';

export default function OutboundFunnelPage() {
  return (
    <div className="space-y-4">
      <Alert className="border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30">
        <Construction className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          Em construção — em breve disponível
        </AlertDescription>
      </Alert>
      <SalesFunnelPage source="outbound" />
    </div>
  );
}
