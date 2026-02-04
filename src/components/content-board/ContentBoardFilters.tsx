import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface ContentBoardFiltersProps {
  filters: {
    assignedTo: string | null;
    serviceId: string | null;
    monthRef: string | null;
  };
  onFiltersChange: (filters: {
    assignedTo: string | null;
    serviceId: string | null;
    monthRef: string | null;
  }) => void;
  teamMembers: { id: string; name: string }[];
  services: { id: string; name: string }[];
  monthOptions: { value: string; label: string }[];
}

export function ContentBoardFilters({
  filters,
  onFiltersChange,
  teamMembers,
  services,
  monthOptions,
}: ContentBoardFiltersProps) {
  const handleReset = () => {
    onFiltersChange({
      assignedTo: null,
      serviceId: null,
      monthRef: null,
    });
  };

  const hasActiveFilters = filters.assignedTo || filters.serviceId || filters.monthRef;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.monthRef || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, monthRef: value === 'all' ? null : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assignedTo || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, assignedTo: value === 'all' ? null : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.serviceId || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, serviceId: value === 'all' ? null : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Plano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os planos</SelectItem>
          {services.map((service) => (
            <SelectItem key={service.id} value={service.id}>
              {service.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
