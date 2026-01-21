// =============================================
// ACCOUNT TEAM - GLOBAL ASSIGNMENT UTILITIES
// =============================================

import { Account, ResponsibleRoleKey, RESPONSIBLE_ROLE_OPTIONS } from '@/types/crm';

// Standard role keys used across all task types
export type RoleKey = 'designer' | 'videomaker' | 'social' | 'traffic' | 'support' | 'cs';

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
 * Resolves the assignee ID from the client's account team based on the role key.
 * This is the central function for auto-assignment across all task types.
 * 
 * @param account - The client account containing team member IDs
 * @param roleKey - The role key (designer, videomaker, social, traffic, support, cs)
 * @returns The member ID for that role, or null if not defined
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
 * 
 * @param account - The client account
 * @param roleKey - The role key to check
 * @returns True if the role has a member assigned
 */
export function isRoleDefinedInAccountTeam(
  account: Account | null | undefined,
  roleKey: RoleKey | string | null | undefined
): boolean {
  return resolveAssigneeFromAccountTeam(account, roleKey) !== null;
}

/**
 * Gets the list of missing roles from the client's account team.
 * 
 * @param account - The client account
 * @returns Array of role keys that are not defined
 */
export function getMissingRoles(account: Account | null | undefined): RoleKey[] {
  if (!account) return Object.keys(ROLE_KEY_TO_ACCOUNT_FIELD) as RoleKey[];
  
  return (Object.keys(ROLE_KEY_TO_ACCOUNT_FIELD) as RoleKey[]).filter(
    (roleKey) => !isRoleDefinedInAccountTeam(account, roleKey)
  );
}

/**
 * Gets the list of defined roles in the client's account team.
 * 
 * @param account - The client account
 * @returns Array of role keys that have members assigned
 */
export function getDefinedRoles(account: Account | null | undefined): RoleKey[] {
  if (!account) return [];
  
  return (Object.keys(ROLE_KEY_TO_ACCOUNT_FIELD) as RoleKey[]).filter(
    (roleKey) => isRoleDefinedInAccountTeam(account, roleKey)
  );
}

/**
 * Calculates the account team completion status.
 * 
 * @param account - The client account
 * @returns Object with completion info
 */
export function getAccountTeamStatus(account: Account | null | undefined): {
  isComplete: boolean;
  total: number;
  defined: number;
  missing: RoleKey[];
  missingLabels: string[];
} {
  const allRoles = Object.keys(ROLE_KEY_TO_ACCOUNT_FIELD) as RoleKey[];
  const missing = getMissingRoles(account);
  const defined = allRoles.length - missing.length;
  
  return {
    isComplete: missing.length === 0,
    total: allRoles.length,
    defined,
    missing,
    missingLabels: missing.map((r) => ROLE_KEY_LABELS[r]),
  };
}

/**
 * Validates if a task can be created for the given client and role.
 * Returns an error message if validation fails, null otherwise.
 * 
 * @param account - The client account
 * @param roleKey - The role key for the task
 * @returns Error message or null
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
 * Essential roles for content: social
 */
export function hasEssentialContentRoles(account: Account | null | undefined): boolean {
  return isRoleDefinedInAccountTeam(account, 'social');
}

/**
 * Helper to check if account team has at least the essential roles for traffic.
 * Essential roles for traffic: designer
 */
export function hasEssentialTrafficRoles(account: Account | null | undefined): boolean {
  return isRoleDefinedInAccountTeam(account, 'designer');
}

/**
 * Helper to check if account team has at least the essential roles for CS.
 * Essential roles for CS: cs
 */
export function hasEssentialCsRoles(account: Account | null | undefined): boolean {
  return isRoleDefinedInAccountTeam(account, 'cs');
}
