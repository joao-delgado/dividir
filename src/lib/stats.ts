import { resolveCategoryColor } from '@/lib/categoryTree'
import type { Budget, Category, Expense, UserId } from '@/lib/types'

// Pure aggregation helpers for the Stats screen. All figures here are *total*
// spend (the full expense amount), not split shares. Stats is about household
// spending patterns, so it deliberately ignores who-owes-whom (that's the Home
// balance). Kept out of the component so the math is testable and the screen
// stays about layout.

export type PeriodMode = 'month' | 'year'

export interface Period {
  mode: PeriodMode
  year: number
  month: number // 0-11, only meaningful in month mode
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** The current month as a Period, for the initial screen state. */
export function currentPeriod(mode: PeriodMode = 'month'): Period {
  const now = new Date()
  return { mode, year: now.getFullYear(), month: now.getMonth() }
}

/** The date prefix a period matches: "2026-07" (month) or "2026" (year). */
export function periodPrefix(p: Period): string {
  return p.mode === 'month' ? `${p.year}-${pad(p.month + 1)}` : `${p.year}`
}

/** Human label for the selected period, e.g. "July 2026" or "2026". */
export function periodLabel(p: Period): string {
  if (p.mode === 'year') return String(p.year)
  const label = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(p.year, p.month, 1)))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Moves the period backward (delta < 0) or forward by whole months/years. */
export function shiftPeriod(p: Period, delta: number): Period {
  if (p.mode === 'year') return { ...p, year: p.year + delta }
  const d = new Date(Date.UTC(p.year, p.month + delta, 1))
  return { mode: 'month', year: d.getUTCFullYear(), month: d.getUTCMonth() }
}

/** Expenses falling inside the period, keeping the incoming (date-desc) order. */
export function expensesInPeriod(expenses: Expense[], p: Period): Expense[] {
  const prefix = periodPrefix(p)
  return expenses.filter((e) => e.date.startsWith(prefix))
}

export function totalSpend(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

// --- monthly trend (bar chart) ----------------------------------------------

export interface MonthBucket {
  key: string // "2026-07"
  label: string // "Jul"
  total: number
  isSelected: boolean
}

/**
 * Buckets for the trend bar chart. In month view: the selected month plus the
 * five before it (6 bars, the selected one highlighted). In year view: all 12
 * months of the selected year.
 */
export function monthlyTrend(expenses: Expense[], p: Period): MonthBucket[] {
  const months: { year: number; month: number }[] = []
  if (p.mode === 'year') {
    for (let m = 0; m < 12; m++) months.push({ year: p.year, month: m })
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(p.year, p.month - i, 1))
      months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() })
    }
  }

  const totals = new Map<string, number>()
  for (const e of expenses) {
    const key = e.date.slice(0, 7)
    totals.set(key, (totals.get(key) ?? 0) + e.amount)
  }

  const selected = periodPrefix(p)
  return months.map(({ year, month }) => {
    const key = `${year}-${pad(month + 1)}`
    const label = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month, 1)))
    return {
      key,
      label: label.replace('.', ''),
      total: totals.get(key) ?? 0,
      isSelected: p.mode === 'month' && key === selected,
    }
  })
}

// --- category breakdown (pie chart) -----------------------------------------

export interface CategorySlice {
  id: string
  name: string
  total: number
  color: string
}

/**
 * Spend grouped by top-level category (subcategory spend rolls up into its
 * parent). Sorted biggest first; zero-spend categories are dropped.
 */
export function categoryBreakdown(
  expenses: Expense[],
  byId: Map<string, Category>,
): CategorySlice[] {
  const totals = new Map<string, number>()
  for (const e of expenses) {
    const cat = byId.get(e.categoryId)
    const topId = cat ? cat.parentId ?? cat.id : '__unknown'
    totals.set(topId, (totals.get(topId) ?? 0) + e.amount)
  }

  return [...totals.entries()]
    .map(([id, total]) => {
      const cat = byId.get(id)
      return {
        id,
        name: cat?.name ?? 'Uncategorized',
        total,
        color: (cat && resolveCategoryColor(byId, cat)) ?? '#cbd5e1',
      }
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)
}

// --- single category detail (pie slice drill-down) --------------------------

export interface SubcategoryTotal {
  id: string
  name: string
  total: number
}

export interface CategoryDetail {
  subcategories: SubcategoryTotal[] // biggest first
  expenses: Expense[] // every expense in this top category, kept date-desc
  total: number
}

/**
 * Everything spent under one top-level category in the period: its per
 * subcategory totals (biggest first) and the individual expenses. `topId` is a
 * top-level category id, or "__unknown" for expenses whose category is missing
 * (matches the id used by categoryBreakdown). Rolls subcategory spend up the
 * same way the pie slice does, so the detail total matches the slice total.
 */
export function categoryDetail(
  expenses: Expense[],
  byId: Map<string, Category>,
  topId: string,
): CategoryDetail {
  const inCategory = expenses.filter((e) => {
    const cat = byId.get(e.categoryId)
    const top = cat ? cat.parentId ?? cat.id : '__unknown'
    return top === topId
  })

  const totals = new Map<string, number>()
  for (const e of inCategory) {
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount)
  }

  const subcategories = [...totals.entries()]
    .map(([id, total]) => ({
      id,
      name: byId.get(id)?.name ?? 'Uncategorized',
      total,
    }))
    .sort((a, b) => b.total - a.total)

  return {
    subcategories,
    expenses: inCategory,
    total: inCategory.reduce((sum, e) => sum + e.amount, 0),
  }
}

// --- cumulative spend per person (line chart, month view only) --------------

export interface DayPoint {
  day: number
  me: number
  partner: number
}

/**
 * Running cumulative spend per person across the days of the selected month.
 * `expenses` should already be scoped to the month. Cumulative (rather than raw
 * daily) is used because irregular daily spend looks noisy; see CLAUDE.md.
 */
export function cumulativeByPerson(
  expenses: Expense[],
  p: Period,
  meId: UserId | undefined,
  partnerId: UserId | undefined,
): DayPoint[] {
  const daysInMonth = new Date(Date.UTC(p.year, p.month + 1, 0)).getUTCDate()
  const meByDay = new Array(daysInMonth + 1).fill(0)
  const partnerByDay = new Array(daysInMonth + 1).fill(0)

  for (const e of expenses) {
    const day = Number(e.date.slice(8, 10))
    if (day < 1 || day > daysInMonth) continue
    if (meId && e.paidBy === meId) meByDay[day] += e.amount
    else if (partnerId && e.paidBy === partnerId) partnerByDay[day] += e.amount
  }

  const points: DayPoint[] = []
  let me = 0
  let partner = 0
  for (let d = 1; d <= daysInMonth; d++) {
    me += meByDay[d]
    partner += partnerByDay[d]
    points.push({ day: d, me, partner })
  }
  return points
}

// --- spend by payer ---------------------------------------------------------

/** Total paid by each user in the period, keyed by userId. */
export function spendByPayer(expenses: Expense[]): Map<UserId, number> {
  const totals = new Map<UserId, number>()
  for (const e of expenses) {
    totals.set(e.paidBy, (totals.get(e.paidBy) ?? 0) + e.amount)
  }
  return totals
}

// --- budget vs actual (month view only) -------------------------------------

export interface BudgetRow {
  categoryId: string
  name: string
  color: string
  budget: number
  actual: number
}

/**
 * Per-category budget compared with actual spend for the month. `budgets` are
 * already scoped to the selected month. Actual spend for a category includes
 * its subcategories' spend.
 */
export function budgetVsActual(
  expenses: Expense[],
  budgets: Budget[],
  byId: Map<string, Category>,
): BudgetRow[] {
  return budgets
    .map((b) => {
      const cat = byId.get(b.categoryId)
      const ids = new Set<string>([b.categoryId])
      for (const c of byId.values()) {
        if (c.parentId === b.categoryId) ids.add(c.id)
      }
      const actual = expenses
        .filter((e) => ids.has(e.categoryId))
        .reduce((sum, e) => sum + e.amount, 0)
      return {
        categoryId: b.categoryId,
        name: cat?.name ?? 'Unknown',
        color: (cat && resolveCategoryColor(byId, cat)) ?? '#cbd5e1',
        budget: b.amount,
        actual,
      }
    })
    .sort((a, b) => b.actual - a.actual)
}

// --- CSV export -------------------------------------------------------------

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Builds a CSV of the given expenses. Columns: date, description, category,
 * subcategory, paidBy, splitType, amount. `nameOf` resolves a userId to a name.
 */
export function expensesToCsv(
  expenses: Expense[],
  byId: Map<string, Category>,
  nameOf: (id: UserId) => string,
): string {
  const header = [
    'date',
    'description',
    'category',
    'subcategory',
    'paidBy',
    'splitType',
    'amount',
  ]
  const rows = expenses.map((e) => {
    const cat = byId.get(e.categoryId)
    let category = 'Uncategorized'
    let subcategory = ''
    if (cat) {
      if (cat.parentId) {
        category = byId.get(cat.parentId)?.name ?? cat.name
        subcategory = cat.name
      } else {
        category = cat.name
      }
    }
    return [
      e.date,
      e.description,
      category,
      subcategory,
      nameOf(e.paidBy),
      e.splitType,
      e.amount.toFixed(2),
    ]
      .map(csvCell)
      .join(',')
  })
  return [header.join(','), ...rows].join('\n')
}

/** Triggers a browser download of `content` as a `.csv` file. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
