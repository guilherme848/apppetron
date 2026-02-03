import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FunnelFilters } from '@/types/salesFunnel';

interface Props {
  filters: FunnelFilters;
  onChange: (filters: FunnelFilters) => void;
}

export function FunnelFiltersComponent({ filters, onChange }: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Ano:</span>
        <Select
          value={filters.year.toString()}
          onValueChange={(value) => onChange({ ...filters, year: parseInt(value) })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
