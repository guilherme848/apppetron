import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, ExternalLink, Search, Filter, Lock } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useSensitivePermission } from "@/hooks/useSensitivePermission";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { ContractStatus, contractStatusLabels } from "@/types/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ContractsList() {
  const { data: contracts, isLoading } = useContracts();
  const { canViewFinancialValues, loading: permLoading } = useSensitivePermission();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const showValues = canViewFinancialValues();

  const filteredContracts = contracts?.filter((contract) => {
    const matchesSearch =
      contract.contract_number.toLowerCase().includes(search.toLowerCase()) ||
      contract.account?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || contract.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const RestrictedValue = () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground cursor-help">
            <Lock className="h-3 w-3" />
            <span className="text-xs">Restrito</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Restrito ao Administrador</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de contratos gerados e assinaturas
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(contractStatusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || permLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !filteredContracts?.length ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum contrato encontrado</h3>
              <p className="text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Tente ajustar os filtros"
                  : "Os contratos aparecerão aqui quando forem gerados"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Número</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Cliente</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Valor MRR</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Origem</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Criado em</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id} className="h-[52px] hover:bg-gradient-to-r hover:from-primary/[0.04] hover:to-transparent transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      {contract.contract_number}
                    </TableCell>
                    <TableCell>{contract.account?.name || "-"}</TableCell>
                    <TableCell>
                      {showValues ? formatCurrency(contract.mrr) : <RestrictedValue />}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {contract.source === "clint" ? "CRM Clint" : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ContractStatusBadge status={contract.status} />
                    </TableCell>
                    <TableCell>
                      {format(new Date(contract.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {contract.external_signing_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={contract.external_signing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/contracts/${contract.id}`}>
                            Ver detalhes
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
