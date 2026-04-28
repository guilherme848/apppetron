import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranscriptionClients } from '@/hooks/useTranscriptions';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;
  onChange: (clientId: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

export function ClientCombobox({
  value,
  onChange,
  placeholder = 'Selecionar cliente...',
  emptyText = 'Nenhum cliente encontrado.',
  allowClear = true,
  size = 'default',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const { data: clients = [], isLoading } = useTranscriptionClients();

  const selected = clients.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-normal min-w-0',
            size === 'sm' && 'h-8 text-sm',
            className,
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Building2 className={cn('shrink-0', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            <span className="truncate">
              {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
            </span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {allowClear && value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    onChange(null);
                  }
                }}
                className="hover:bg-muted rounded p-0.5 cursor-pointer"
                aria-label="Remover cliente"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." className="h-9" />
          <CommandList>
            <CommandEmpty>{isLoading ? 'Carregando...' : emptyText}</CommandEmpty>
            <CommandGroup>
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.id}`}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === c.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
