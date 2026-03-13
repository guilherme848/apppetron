import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative overflow-hidden"
            onClick={toggleTheme}
          >
            <Sun
              className={cn(
                'h-4 w-4 absolute transition-all duration-300',
                isDark
                  ? 'rotate-90 scale-0 opacity-0'
                  : 'rotate-0 scale-100 opacity-100',
              )}
            />
            <Moon
              className={cn(
                'h-4 w-4 absolute transition-all duration-300',
                isDark
                  ? 'rotate-0 scale-100 opacity-100'
                  : '-rotate-90 scale-0 opacity-0',
              )}
            />
            <span className="sr-only">Alternar tema</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          {isDark ? 'Modo claro' : 'Modo escuro'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
