import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TeamIncompleteWarningProps {
  clientId: string | null | undefined;
  clientName?: string;
  roleLabel: string;
  message?: string;
}

export function TeamIncompleteWarning({ 
  clientId, 
  clientName,
  roleLabel, 
  message 
}: TeamIncompleteWarningProps) {
  const navigate = useNavigate();
  
  const handleGoToAccountTeam = () => {
    if (clientId) {
      navigate(`/crm/${clientId}?tab=team`);
    }
  };
  
  const displayMessage = message || 
    `O cargo "${roleLabel}" não está definido no Time da Conta${clientName ? ` de ${clientName}` : ''}. Defina o responsável para criar esta tarefa.`;
  
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <span className="flex-1">{displayMessage}</span>
        {clientId && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGoToAccountTeam}
            className="whitespace-nowrap"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Definir Time da Conta
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
