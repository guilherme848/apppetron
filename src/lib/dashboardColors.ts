// Petron Dashboard Color Palette
export const DC = {
  orange: '#F97316',
  dark: '#1B2B3B',
  teal: '#0F766E',
  red: '#EF4444',
  bgPage: '#F8FAFC',
  bgCard: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  // Opacity variants
  orange20: 'rgba(249,115,22,0.20)',
  orange40: 'rgba(249,115,22,0.40)',
  orange60: 'rgba(249,115,22,0.60)',
  teal20: 'rgba(15,118,110,0.20)',
  teal40: 'rgba(15,118,110,0.40)',
  teal60: 'rgba(15,118,110,0.60)',
  redBg: '#FEF2F2',
  orangeBg: '#FFF7ED',
} as const;

export const ROLE_CHIP_COLORS: Record<string, string> = {
  designer: DC.orange,
  social: DC.teal,
  videomaker: DC.dark,
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
  backgroundColor: DC.bgCard,
  border: `1px solid ${DC.border}`,
  borderRadius: '8px',
  color: DC.textPrimary,
};
