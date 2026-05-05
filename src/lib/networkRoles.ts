// Display label for contacts.network_role.
// Lovable used a fixed enum; ours is free-text. Map known values to clean
// labels, fall back to humanizing the raw string.

const KNOWN: Record<string, string> = {
  booster: 'Booster',
  connector: 'Connector',
  recruiter_internal: 'Recruiter (internal)',
  recruiter_external: 'Recruiter (external)',
  hiring_manager: 'Hiring manager',
  mentor_peer: 'Mentor / peer',
}

export function networkRoleLabel(role: string | null | undefined): string | null {
  if (!role) return null
  const normalized = role.toLowerCase().replace(/[\s-]+/g, '_')
  if (KNOWN[normalized]) return KNOWN[normalized]
  // Fallback: capitalize first word of the raw string
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
}
