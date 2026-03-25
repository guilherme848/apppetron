import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Building2, FileText, Lock } from "lucide-react";
import {
  useContract,
  useContractEvents,
  useContractFiles,
  useContractSigners,
} from "@/hooks/useContracts";
import { useSensitivePermission } from "@/hooks/useSensitivePermission";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { ContractTimeline } from "@/components/contracts/ContractTimeline";
import { ContractFiles } from "@/components/contracts/ContractFiles";
import { ContractSigners } from "@/components/contracts/ContractSigners";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: contract, isLoading: contractLoading } = useContract(id);
  const { data: events = [], isLoading: eventsLoading } = useContractEvents(id);
  const { data: files = [], isLoading: filesLoading } = useContractFiles(id);
  const { data: signers = [], isLoading: signersLoading } = useContractSigners(id);
  const { canViewFinancialValues, loading: permLoading } = useSensitivePermission();

  const showValues = canViewFinancialValues();

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const RestrictedValue = ({ size = "default" }: { size?: "default" | "large" }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 text-muted-foreground cursor-help ${size === "large" ? "text-sm" : "text-xs"}`}>
            <Lock className={size === "large" ? "h-4 w-4" : "h-3 w-3"} />
            <span>Restrito ao Administrador</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Valores financeiros são restritos ao cargo Administrador</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (contractLoading || permLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Contrato não encontrado</h3>
          <Button className="mt-4" asChild>
            <Link to="/contracts">Voltar para lista</Link>
          </Button>
        </div>
      </div>
    );
  }

  const fieldsSnapshot = contract.fields_snapshot as Record<string, unknown> | null;
  const canUploadSignedPdf = ["sent", "signing", "generated"].includes(contract.status);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/contracts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{contract.contract_number}</h1>
              <ContractStatusBadge status={contract.status} />
            </div>
            <p className="text-muted-foreground">{contract.account?.name}</p>
          </div>
        </div>

        {contract.external_signing_url && (
          <Button asChild>
            <a
              href={contract.external_signing_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir para assinatura
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Mensal (MRR)</p>
                <p className="font-semibold">
                  {showValues ? formatCurrency(contract.mrr) : <RestrictedValue size="large" />}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Setup</p>
                <p className="font-semibold">
                  {showValues ? formatCurrency(contract.setup_fee) : <RestrictedValue size="large" />}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total 1º Mês</p>
                <p className="font-semibold">
                  {showValues ? formatCurrency(contract.total_first_month) : <RestrictedValue size="large" />}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Início do Contrato</p>
                <p className="font-semibold">{formatDate(contract.contract_start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fim do Contrato</p>
                <p className="font-semibold">{formatDate(contract.contract_end_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Origem</p>
                <Badge variant="outline">
                  {contract.source === "clint" ? "CRM Clint" : "Manual"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Client Info from Snapshot */}
          {fieldsSnapshot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados do Cliente (Snapshot)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome/Razão Social</p>
                  <p className="font-medium">{String(fieldsSnapshot.client_name || "-")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ/CPF</p>
                  <p className="font-medium">{String(fieldsSnapshot.client_cnpj || "-")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{String(fieldsSnapshot.client_email || "-")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{String(fieldsSnapshot.client_phone || "-")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium">{String(fieldsSnapshot.client_address || "-")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="font-medium">{String(fieldsSnapshot.plan_name || "-")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-medium">{String(fieldsSnapshot.payment_method || "-")}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signers */}
          {signersLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <ContractSigners signers={signers} />
          )}

          {/* Files */}
          {filesLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <ContractFiles
              contractId={contract.id}
              files={files}
              canUpload={canUploadSignedPdf}
            />
          )}
        </div>

        {/* Sidebar - Timeline */}
        <div>
          {eventsLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <ContractTimeline events={events} />
          )}
        </div>
      </div>
    </div>
  );
}
