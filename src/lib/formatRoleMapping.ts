// =============================================
// FORMAT TO ROLE MAPPING FOR PRODUCTION/CHANGES
// =============================================

import { RoleKey } from './accountTeam';

// Formats that map to designer
export const DESIGNER_FORMATS = ['post', 'carrossel', 'carousel', 'story', 'artigo'];

// Formats that map to videomaker
export const VIDEOMAKER_FORMATS = ['video', 'vídeo', 'reels', 'shorts'];

// Stages where auto-assignment by format applies
export const FORMAT_ASSIGNMENT_STAGES = ['production', 'changes'];

/**
 * Gets the role key based on the post format.
 * Used for auto-assignment in production/changes stages.
 * 
 * @param format - The post format (e.g., 'post', 'carrossel', 'reels', 'video')
 * @returns The role key ('designer' or 'videomaker') or null if format doesn't map
 */
export function getRoleKeyFromFormat(format: string | null | undefined): RoleKey | null {
  if (!format) return null;
  
  const normalizedFormat = format.toLowerCase().trim();
  
  if (DESIGNER_FORMATS.includes(normalizedFormat)) {
    return 'designer';
  }
  
  if (VIDEOMAKER_FORMATS.includes(normalizedFormat)) {
    return 'videomaker';
  }
  
  return null;
}

/**
 * Checks if a stage uses format-based assignment
 */
export function isFormatAssignmentStage(status: string | null | undefined): boolean {
  if (!status) return false;
  return FORMAT_ASSIGNMENT_STAGES.includes(status);
}

/**
 * Gets the label for a role key
 */
export function getRoleLabel(roleKey: RoleKey | string | null): string {
  switch (roleKey) {
    case 'designer': return 'Designer';
    case 'videomaker': return 'Videomaker';
    case 'social': return 'Social Media';
    case 'traffic': return 'Tráfego';
    case 'support': return 'Atendimento';
    case 'cs': return 'CS';
    default: return roleKey || '-';
  }
}

/**
 * Gets a description of the auto-assignment for the current format
 */
export function getFormatAssignmentDescription(format: string | null | undefined): string | null {
  const roleKey = getRoleKeyFromFormat(format);
  if (!roleKey) return null;
  
  const roleLabel = getRoleLabel(roleKey);
  return `Auto: ${roleLabel} (pelo formato)`;
}
