import { CheckCircle, Clock, XCircle, User } from "lucide-react";
import { ContractSigner } from "@/types/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContractSignersProps {
  signers: ContractSigner[];
}

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  signed: CheckCircle,
  refused: XCircle,
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  signed: "bg-success/10 text-success",
  refused: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  signed: "Assinado",
  refused: "Recusado",
};

export function ContractSigners({ signers }: ContractSignersProps) {
  if (!signers.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Signatários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum signatário registrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Signatários</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {signers.map((signer) => {
          const Icon = statusIcons[signer.status] || Clock;
          return (
            <div
              key={signer.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{signer.name}</p>
                  <p className="text-sm text-muted-foreground">{signer.email}</p>
                  {signer.signed_at && (
                    <p className="text-xs text-muted-foreground">
                      Assinado em: {format(new Date(signer.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
              <Badge className={statusColors[signer.status]}>
                <Icon className="h-3 w-3 mr-1" />
                {statusLabels[signer.status] || signer.status}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
