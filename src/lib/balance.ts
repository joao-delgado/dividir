import type { Expense, Settlement, UserId } from '@/lib/types'

// All math is done in integer cents to avoid floating-point drift, then
// converted back to euros at the edges.

export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

/**
 * How much the payer is owed by the other person for a single expense, in cents.
 * - 'solo': the non-payer owes the full amount.
 * - 'equal': each owes half; on an odd amount the leftover cent goes to the
 *   payer (who is owed), i.e. the non-payer owes the rounded-up half.
 */
export function owedCents(expense: Expense): number {
  const total = toCents(expense.amount)
  if (expense.splitType === 'solo') return total
  return Math.ceil(total / 2)
}

/** Signed net for `meId` in cents. Positive = partner owes me, negative = I owe. */
export function expenseNetForMe(expense: Expense, meId: UserId): number {
  const owed = owedCents(expense)
  return expense.paidBy === meId ? owed : -owed
}

export function totalBalanceCents(expenses: Expense[], meId: UserId): number {
  return expenses.reduce((sum, e) => sum + expenseNetForMe(e, meId), 0)
}

/** Per-row summary from my perspective: did I lend or borrow, and how much. */
export interface RowSplit {
  direction: 'lent' | 'borrowed'
  amount: number // euros
}

export function rowSplit(expense: Expense, meId: UserId): RowSplit {
  return {
    direction: expense.paidBy === meId ? 'lent' : 'borrowed',
    amount: fromCents(owedCents(expense)),
  }
}

/** The date ("YYYY-MM-DD") of the most recent settlement, or null if none. */
export function lastSettlementDate(settlements: Settlement[]): string | null {
  if (settlements.length === 0) return null
  return settlements.reduce((max, s) => (s.date > max ? s.date : max), settlements[0].date)
}

/**
 * Expenses not yet settled: everything dated after the last settlement (or all
 * expenses if there has never been one). Matches the Home list / balance card.
 */
export function unsettledExpenses(
  expenses: Expense[],
  settlements: Settlement[],
): Expense[] {
  const last = lastSettlementDate(settlements)
  if (!last) return expenses
  return expenses.filter((e) => e.date > last)
}

/**
 * The expenses a given settlement cleared: those dated after the previous
 * settlement and on or before this one. With date-only records this is the best
 * boundary available (see the settle-up notes in CLAUDE.md).
 */
export function expensesInSettlement(
  expenses: Expense[],
  settlements: Settlement[],
  settlement: Settlement,
): Expense[] {
  const sorted = [...settlements].sort((a, b) => a.date.localeCompare(b.date))
  const idx = sorted.findIndex((s) => s.id === settlement.id)
  const prevDate = idx > 0 ? sorted[idx - 1].date : null
  return expenses.filter(
    (e) => (prevDate === null || e.date > prevDate) && e.date <= settlement.date,
  )
}

/**
 * Whether this is the most recent settlement. Only the latest one can be undone
 * cleanly: deleting an older one wouldn't change what's on Home (a newer
 * settlement still caps the "unsettled" window).
 */
export function isMostRecentSettlement(
  settlements: Settlement[],
  settlement: Settlement,
): boolean {
  if (settlements.length === 0) return false
  const latest = settlements.reduce((max, s) => (s.date > max.date ? s : max), settlements[0])
  return latest.id === settlement.id
}
