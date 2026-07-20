import { monthAbbrev } from '@/lib/format'
import type { Period } from '@/lib/stats'
import type { Saving, UserId } from '@/lib/types'

// Pure helpers for the savings feature: which month to prompt for, looking up a
// person's entry, and shaping the last-few-months bar chart. Kept out of the
// components so the month math stays testable.

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** A "YYYY-MM" key from a 0-indexed month. */
function monthKey(year: number, month: number): string {
  const d = new Date(year, month, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/**
 * The month that just ended, as "YYYY-MM". This is what the Home prompt asks
 * about: you only know how much you saved once the month is over, so on any day
 * of July we're asking about June.
 */
export function lastCompletedMonthKey(now = new Date()): string {
  return monthKey(now.getFullYear(), now.getMonth() - 1)
}

/** The last completed month as a Period, for the savings chart's initial view. */
export function lastCompletedPeriod(now = new Date()): Period {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { mode: 'month', year: d.getFullYear(), month: d.getMonth() }
}

/** True if a "YYYY-MM" key is later than the month that just ended. */
export function isFutureMonth(month: string, now = new Date()): boolean {
  return month > lastCompletedMonthKey(now)
}

/** The twelve "YYYY-MM" keys of a calendar year, January first. */
export function monthKeysOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, m) => `${year}-${pad(m + 1)}`)
}

/** This user's savings entry for a given month, or undefined if none yet. */
export function savingFor(
  savings: Saving[],
  userId: UserId | undefined,
  month: string,
): Saving | undefined {
  if (!userId) return undefined
  return savings.find((s) => s.userId === userId && s.monthYear === month)
}

export interface SavingsBucket {
  key: string // "2026-06"
  label: string // "Jun"
  meAmount: number | null // null = not logged, so no bar (distinct from 0)
  partnerAmount: number | null
}

/**
 * Both people's saved amounts across the months of a period: the twelve months
 * of the year in year view, or the selected month plus the five before it in
 * month view (a rolling six). A null amount means that person hasn't logged the
 * month, so the chart draws no bar for them there.
 */
export function savingsChartForPeriod(
  savings: Saving[],
  period: Period,
  meId?: UserId,
  partnerId?: UserId,
): SavingsBucket[] {
  const months: { year: number; month: number }[] = []
  if (period.mode === 'year') {
    for (let m = 0; m < 12; m++) months.push({ year: period.year, month: m })
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(period.year, period.month - i, 1))
      months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() })
    }
  }

  const lookup = (userId: UserId | undefined, key: string): number | null => {
    if (!userId) return null
    const hit = savings.find((s) => s.userId === userId && s.monthYear === key)
    return hit ? hit.amount : null
  }

  return months.map(({ year, month }) => {
    const key = `${year}-${pad(month + 1)}`
    return {
      key,
      label: monthAbbrev(`${key}-01`),
      meAmount: lookup(meId, key),
      partnerAmount: lookup(partnerId, key),
    }
  })
}
