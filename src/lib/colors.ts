// Deterministic company → favicon color/initial.
// The live `jobs` table stores company as free-text, no FK to target_companies,
// so we synthesize a stable visual identity per company name.

const PALETTE = [
  '#fb923c', // orange
  '#a78bfa', // violet
  '#34d399', // emerald
  '#818cf8', // indigo
  '#f87171', // red
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#fbbf24', // amber
  '#635bff', // brand-ish purple
  '#5e6ad2', // linear-ish indigo
  '#86efac', // mint
  '#fda4af', // rose
]

function hash(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0
  }
  return h
}

export function companyColor(name: string | null | undefined) {
  if (!name) return '#94a3b8'
  return PALETTE[hash(name) % PALETTE.length]
}

export function companyInitial(name: string | null | undefined) {
  if (!name) return '?'
  const trimmed = name.trim()
  return trimmed ? trimmed[0]!.toUpperCase() : '?'
}
