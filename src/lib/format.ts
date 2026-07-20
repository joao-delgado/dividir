// Currency and date formatting. Money is EUR in pt-PT; dates are stored as
// plain "YYYY-MM-DD" strings (no time/zone), so we parse them at UTC noon to
// avoid any daylight-saving / timezone off-by-one when formatting.

const eur = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
})

const eurNoCents = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** Formats as pt-PT currency, dropping ",00" for whole-euro amounts (e.g. "60 €" not "60,00 €"). */
export function formatCurrency(amount: number): string {
  const isWholeEuro = Math.round(amount * 100) % 100 === 0
  return isWholeEuro ? eurNoCents.format(amount) : eur.format(amount)
}

/** Parses a typed "27,16" or "27.16" into a euro number, or null if not a number. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Short month for the date column, e.g. "Jul". */
export function monthAbbrev(dateStr: string): string {
  const s = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  }).format(toUtcDate(dateStr))
  return capitalize(s.replace('.', ''))
}

/** Two-digit day for the date column, e.g. "07". */
export function dayNumber(dateStr: string): string {
  return dateStr.slice(8, 10)
}

/** Month-group heading, e.g. "July 2026". */
export function monthYearLabel(dateStr: string): string {
  const s = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcDate(dateStr))
  return capitalize(s)
}

/** Grouping key, e.g. "2026-07". */
export function monthYearKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** Full date, e.g. "18 Jul 2026". */
export function fullDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toUtcDate(dateStr))
}

/** Today as "YYYY-MM-DD" in local time (for date-picker defaults). */
export function todayStr(): string {
  const now = new Date()
  return dateStr(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Builds a "YYYY-MM-DD" string from year, 0-indexed month, and day. */
export function dateStr(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** Splits a "YYYY-MM-DD" string into { year, month (0-indexed), day }. */
export function splitDate(dateStr: string): {
  year: number
  month: number
  day: number
} {
  const [y, m, d] = dateStr.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}
