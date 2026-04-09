import SalesFunnelPage from '@/pages/commercial/SalesFunnelPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Construction } from 'lucide-react';

export default function OutboundFunnelPage() {
  return (
    <div className="space-y-4">
      <Alert className="border-warning/30 bg-warning/10">
        <Construction className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning">
          Em construção — em breve disponível
        </AlertDescription>
      </Alert>
      <SalesFunnelPage source="outbound" />
    </div>
  );
}
