// Petron Dashboard Color Palette — Theme-aware via CSS variables
// These values resolve via CSS custom properties, supporting both light and dark modes automatically.

export const DC = {
  // Accent colors (resolved via CSS vars for theme support)
  orange: 'hsl(var(--primary))',
  teal: 'hsl(var(--success))',
  red: 'hsl(var(--destructive))',
  dark: 'hsl(var(--foreground))',

  // Backgrounds
  bgPage: 'hsl(var(--background))',
  bgCard: 'hsl(var(--card))',

  // Text
  textPrimary: 'hsl(var(--foreground))',
  textSecondary: 'hsl(var(--muted-foreground))',

  // Border
  border: 'hsl(var(--border))',

  // Opacity variants (kept as rgba for inline style compatibility)
  orange20: 'hsl(var(--primary) / 0.15)',
  orange40: 'hsl(var(--primary) / 0.30)',
  orange60: 'hsl(var(--primary) / 0.50)',
  teal20: 'hsl(var(--success) / 0.15)',
  teal40: 'hsl(var(--success) / 0.30)',
  teal60: 'hsl(var(--success) / 0.50)',
  redBg: 'hsl(var(--destructive) / 0.08)',
  orangeBg: 'hsl(var(--primary) / 0.08)',
} as const;

export const ROLE_CHIP_COLORS: Record<string, string> = {
  designer: 'hsl(var(--primary))',
  social: 'hsl(var(--success))',
  videomaker: 'hsl(var(--foreground))',
};

export const ROLE_LABELS: Record<string, string> = {
  designer: 'Designer',
  videomaker: 'Videomaker',
  social: 'Social Media',
  traffic: 'Tráfego',
  support: 'Suporte',
  cs: 'CS',
};

export const PRODUCTION_ROLES = ['designer', 'social', 'videomaker'] as const;

export const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  color: 'hsl(var(--foreground))',
};
