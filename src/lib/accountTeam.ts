// =============================================
// ACCOUNT TEAM - GLOBAL ASSIGNMENT UTILITIES
// =============================================

import { Account, ResponsibleRoleKey, RESPONSIBLE_ROLE_OPTIONS } from '@/types/crm';

// Standard role keys used across all task types
export type RoleKey = 'designer' | 'videomaker' | 'social' | 'traffic' | 'support' | 'cs';

// Plan capability flags that control which roles are visible
export interface PlanFlags {
  has_content: boolean;
  has_traffic: boolean;
}

// Default flags: all roles visible
export const DEFAULT_PLAN_FLAGS: PlanFlags = { has_content: true, has_traffic: true };

// Map role key to account field name
export const ROLE_KEY_TO_ACCOUNT_FIELD: Record<RoleKey, keyof Account> = {
  designer: 'designer_member_id',
  videomaker: 'videomaker_member_id',
  social: 'social_member_id',
  traffic: 'traffic_member_id',
  support: 'support_member_id',
  cs: 'cs_member_id',
};

// Map role key to display label
export const ROLE_KEY_LABELS: Record<RoleKey, string> = {
  designer: 'Designer',
  videomaker: 'Videomaker',
  social: 'Social Media',
  traffic: 'Tráfego',
  support: 'Atendimento',
  cs: 'CS',
};

// All available role options for select dropdowns
export const ROLE_OPTIONS: { value: RoleKey; label: string }[] = [
  { value: 'designer', label: 'Designer' },
  { value: 'videomaker', label: 'Videomaker' },
  { value: 'social', label: 'Social Media' },
  { value: 'traffic', label: 'Tráfego' },
  { value: 'support', label: 'Atendimento' },
  { value: 'cs', label: 'CS' },
];

/**
 * Returns the list of roles that should be visible based on the plan's capabilities.
 * - Designer, Videomaker, Atendimento, CS → always visible
 * - Social Media → visible only if has_content = true
 * - Tráfego → visible only if has_traffic = true
 */
export function getVisibleRoles(flags: PlanFlags = DEFAULT_PLAN_FLAGS): RoleKey[] {
  const roles: RoleKey[] = ['designer', 'videomaker'];
  if (flags.has_content) roles.push('social');
  if (flags.has_traffic) roles.push('traffic');
  roles.push('support', 'cs');
  return roles;
}

/**
 * Resolves the assignee ID from the client's account team based on the role key.
 */
export function resolveAssigneeFromAccountTeam(
  account: Account | null | undefined,
  roleKey: RoleKey | string | null | undefined
): string | null {
  if (!account || !roleKey) return null;
  
  const field = ROLE_KEY_TO_ACCOUNT_FIELD[roleKey as RoleKey];
  if (!field) return null;
  
  const memberId = account[field];
  return (memberId as string | null | undefined) || null;
}

/**
 * Checks if a specific role is defined in the client's account team.
 */
export function isRoleDefinedInAccountTeam(
  account: Account | null | undefined,
  roleKey: RoleKey | string | null | undefined
): boolean {
  return resolveAssigneeFromAccountTeam(account, roleKey) !== null;
}

/**
 * Gets the list of missing roles from the client's account team,
 * considering only the visible roles for the plan.
 */
export function getMissingRoles(account: Account | null | undefined, flags?: PlanFlags): RoleKey[] {
  const visibleRoles = getVisibleRoles(flags);
  if (!account) return visibleRoles;
  
  return visibleRoles.filter(
    (roleKey) => !isRoleDefinedInAccountTeam(account, roleKey)
  );
}

/**
 * Gets the list of defined roles in the client's account team,
 * considering only the visible roles for the plan.
 */
export function getDefinedRoles(account: Account | null | undefined, flags?: PlanFlags): RoleKey[] {
  if (!account) return [];
  
  const visibleRoles = getVisibleRoles(flags);
  return visibleRoles.filter(
    (roleKey) => isRoleDefinedInAccountTeam(account, roleKey)
  );
}

/**
 * Calculates the account team completion status,
 * considering only the visible roles for the plan.
 */
export function getAccountTeamStatus(account: Account | null | undefined, flags?: PlanFlags): {
  isComplete: boolean;
  total: number;
  defined: number;
  missing: RoleKey[];
  missingLabels: string[];
} {
  const visibleRoles = getVisibleRoles(flags);
  const missing = getMissingRoles(account, flags);
  const defined = visibleRoles.length - missing.length;
  
  return {
    isComplete: missing.length === 0,
    total: visibleRoles.length,
    defined,
    missing,
    missingLabels: missing.map((r) => ROLE_KEY_LABELS[r]),
  };
}

/**
 * Validates if a task can be created for the given client and role.
 */
export function validateTaskAssignment(
  account: Account | null | undefined,
  roleKey: RoleKey | string | null | undefined
): string | null {
  if (!account) {
    return 'Selecione um cliente para continuar.';
  }
  
  if (!roleKey) {
    return 'Selecione um cargo responsável.';
  }
  
  if (!isRoleDefinedInAccountTeam(account, roleKey)) {
    const label = ROLE_KEY_LABELS[roleKey as RoleKey] || roleKey;
    return `Defina o responsável do cargo "${label}" no Time da Conta do cliente para criar esta tarefa.`;
  }
  
  return null;
}

/**
 * Helper to check if account team has at least the essential roles for content.
 */
export function hasEssentialContentRoles(account: Account | null | undefined): boolean {
  return isRoleDefinedInAccountTeam(account, 'social');
}

/**
 * Helper to check if account team has at least the essential roles for traffic.
 */
export function hasEssentialTrafficRoles(account: Account | null | undefined): boolean {
  return isRoleDefinedInAccountTeam(account, 'designer');
}

/**
 * Helper to check if account team has at least the essential roles for CS.
 */
export function hasEssentialCsRoles(account: Account | null | undefined): boolean {
  return isRoleDefinedInAccountTeam(account, 'cs');
}
