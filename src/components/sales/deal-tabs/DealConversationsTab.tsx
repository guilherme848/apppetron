import { MessageCircle } from 'lucide-react';

export function DealConversationsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <MessageCircle className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">Conversas</p>
      <p className="text-xs mt-1 max-w-xs">
        Integração futura com WhatsApp Business API. As conversas aparecerão aqui automaticamente.
      </p>
    </div>
  );
}
