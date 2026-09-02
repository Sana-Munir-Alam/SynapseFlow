const UNIT_MS: Record<string, number> = { s: 1000, m: 1000 * 60, h: 1000 * 60 * 60, d: 1000 * 60 * 60 * 24 }

/**
 * Parses a jsonwebtoken-style duration string ("15m", "7d") into milliseconds.
 * Only covers the s/m/h/d suffixes actually used by ACCESS_TOKEN_EXPIRY —
 * not a general-purpose replacement for the `ms` package.
 */
export function parseExpiryToMs(expiry: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(expiry.trim())
    if (!match) throw new Error(`Invalid duration format: "${expiry}". Expected e.g. "15m", "7d".`)
    const [, value, unit] = match
    return Number(value) * UNIT_MS[unit]
}