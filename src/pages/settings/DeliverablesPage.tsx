import { Package } from 'lucide-react';
import { DeliverablesTab } from '@/components/settings/DeliverablesTab';

export default function DeliverablesPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Entregas do Plano
        </h1>
        <p className="text-muted-foreground">Catálogo de entregáveis e configuração por plano.</p>
      </div>
      <DeliverablesTab />
    </>
  );
}
