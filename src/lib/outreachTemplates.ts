// Action labels per network role. Used by actionEngine to pick the verb on
// each step row ("Ask for referral" vs "Periodic check-in" etc).
//
// Our contacts.network_role is a free-text column so we accept anything;
// known values get a tailored label, the rest fall back to "Reach out".

export type KnownNetworkRole =
  | 'booster'
  | 'connector'
  | 'recruiter_internal'
  | 'recruiter_external'
  | 'hiring_manager'
  | 'mentor_peer'

const PRIMARY_ACTION: Record<KnownNetworkRole, string> = {
  booster: 'Ask for referral',
  connector: 'Ask who they know',
  recruiter_internal: 'Submit for role',
  recruiter_external: 'Share search criteria',
  hiring_manager: 'Direct pitch',
  mentor_peer: 'Periodic check-in',
}

export function getPrimaryAction(role: string | null | undefined): string {
  if (!role) return 'Reach out'
  const normalized = role.toLowerCase().replace(/[\s-]+/g, '_') as KnownNetworkRole
  return PRIMARY_ACTION[normalized] ?? 'Reach out'
}
