import { Shield } from 'lucide-react';
import { DynamicAccessTab } from '@/components/settings/DynamicAccessTab';

export default function PermissionsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Controle de Acessos
        </h1>
        <p className="text-muted-foreground">
          Defina o que cada cargo e usuário pode ver e fazer no sistema.
        </p>
      </div>
      <DynamicAccessTab />
    </>
  );
}
