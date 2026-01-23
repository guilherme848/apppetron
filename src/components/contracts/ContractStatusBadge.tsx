import { Badge } from "@/components/ui/badge";
import { ContractStatus, contractStatusLabels, contractStatusColors } from "@/types/contracts";

interface ContractStatusBadgeProps {
  status: ContractStatus;
}

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  return (
    <Badge className={contractStatusColors[status]}>
      {contractStatusLabels[status]}
    </Badge>
  );
}
