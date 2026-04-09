import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Centralized plan badge CSS classes.
 * Accepts nullable planName for convenience — returns fallback style.
 */
export function getPlanBadgeStyle(planName: string | null | undefined): string {
  if (!planName) return 'bg-muted text-muted-foreground border-border';
  const lower = planName.toLowerCase();
  if (lower.includes('start')) return 'bg-secondary/80 text-secondary-foreground border-border';
  if (lower.includes('performance')) return 'bg-[hsl(var(--info)/.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/.25)]';
  if (lower.includes('escala')) return 'bg-primary/12 text-primary border-primary/25';
  if (lower.includes('growth')) return 'bg-purple-500/12 text-purple-600 dark:text-purple-400 border-purple-500/25';
  return 'bg-muted text-muted-foreground border-border';
}
