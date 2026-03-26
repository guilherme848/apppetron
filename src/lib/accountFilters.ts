/**
 * Filters out internal accounts (cliente_interno = true).
 * Use this on arrays of accounts fetched from Supabase.
 */
export function excludeInternalAccounts<T extends { cliente_interno?: boolean | null }>(
  accounts: T[]
): T[] {
  return accounts.filter(a => !a.cliente_interno);
}

/**
 * Supabase query filter string to exclude internal accounts.
 * Usage: .or('cliente_interno.is.null,cliente_interno.eq.false')
 */
export const EXCLUDE_INTERNAL_FILTER = 'cliente_interno.is.null,cliente_interno.eq.false';
