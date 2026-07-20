import { doc, getDocs, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { collections } from '@/lib/firestore'
import type { SeedUser } from '@/lib/seed'
import type { Category } from '@/lib/types'

/**
 * Optional one-off importer for a Splitwise CSV export, so a new deployer can
 * bring their existing Splitwise history into their own instance instead of
 * starting from zero. Generic: takes whatever CSV a user uploads, no data of
 * ours baked in.
 *
 * Expected columns: Date, Description, Category, Cost, Currency, then one
 * column per group member (Splitwise's standard export shape). Each person
 * column holds that row's net effect on their balance: positive means they
 * paid more than their share (or, on a "Payment" row, that they sent money to
 * settle up), negative means the opposite.
 *
 * This app only supports 50/50 or fully-solo splits (see CLAUDE.md), so a row
 * whose split isn't close to one of those is imported as 'equal' and flagged
 * as approximated for the user to review afterward.
 */

const FIRESTORE_BATCH_LIMIT = 500
const FIXED_COLUMNS = ['date', 'description', 'category', 'cost', 'currency']
const ROUNDING_TOLERANCE = 0.02

/** Splits a CSV line into fields, honoring double-quoted fields (with "" escapes). */
function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      fields.push(field)
      field = ''
    } else {
      field += c
    }
  }
  fields.push(field)
  return fields
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.length > 0)
    .map(splitCsvLine)
}

function parseAmount(raw: string | undefined): number {
  const n = Number((raw ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** Reads just the header row to discover the per-person column names. */
export function readSplitwiseHeader(csvText: string): string[] {
  const rows = parseCsv(csvText)
  if (rows.length === 0) throw new Error('Empty file.')
  const header = rows[0].map((h) => h.trim())
  const lower = header.map((h) => h.toLowerCase())
  if (FIXED_COLUMNS.some((f, i) => lower[i] !== f)) {
    throw new Error(
      "Doesn't look like a Splitwise export. Expected columns: Date, Description, Category, Cost, Currency, then one column per person.",
    )
  }
  const personColumns = header.slice(FIXED_COLUMNS.length)
  if (personColumns.length < 2) {
    throw new Error('Expected at least two person columns in the export.')
  }
  return personColumns
}

interface ParsedExpense {
  date: string
  description: string
  categoryName: string
  amount: number
  paidBy: 'a' | 'b'
  splitType: 'equal' | 'solo'
  approximated: boolean
}

interface ParsedSettlement {
  date: string
  from: 'a' | 'b'
  to: 'a' | 'b'
  amount: number
}

export interface ParseResult {
  expenses: ParsedExpense[]
  settlements: ParsedSettlement[]
  skipped: number
}

/** Parses every row given which two columns hold each person's balance. */
export function parseSplitwiseCsv(
  csvText: string,
  personAColumn: string,
  personBColumn: string,
): ParseResult {
  const rows = parseCsv(csvText)
  const header = rows[0].map((h) => h.trim())
  const idxA = header.indexOf(personAColumn)
  const idxB = header.indexOf(personBColumn)
  if (idxA === -1 || idxB === -1) {
    throw new Error('Could not find the selected person columns in the file.')
  }

  const expenses: ParsedExpense[] = []
  const settlements: ParsedSettlement[] = []
  let skipped = 0

  for (const row of rows.slice(1)) {
    const date = (row[0] ?? '').trim()
    const description = (row[1] ?? '').trim()
    const category = (row[2] ?? '').trim()
    const cost = parseAmount(row[3])
    const valA = parseAmount(row[idxA])
    const valB = parseAmount(row[idxB])

    // Skips the trailing "Total balance" summary row and any malformed row.
    if (!isIsoDate(date) || description.toLowerCase() === 'total balance') {
      skipped++
      continue
    }
    // Zero-balance row: nothing owed either way, nothing to record.
    if (Math.abs(valA) < ROUNDING_TOLERANCE && Math.abs(valB) < ROUNDING_TOLERANCE) {
      skipped++
      continue
    }

    const payerIsA = valA > valB
    const positive = Math.abs(payerIsA ? valA : valB)
    const amount = cost > 0 ? cost : Math.abs(valA - valB) / 2

    if (category.toLowerCase() === 'payment') {
      settlements.push({
        date,
        from: payerIsA ? 'a' : 'b',
        to: payerIsA ? 'b' : 'a',
        amount: positive,
      })
      continue
    }

    const soloMatch = Math.abs(positive - amount) <= ROUNDING_TOLERANCE
    const equalMatch = Math.abs(positive - amount / 2) <= ROUNDING_TOLERANCE
    expenses.push({
      date,
      description: description || category || 'Expense',
      categoryName: category,
      amount,
      paidBy: payerIsA ? 'a' : 'b',
      splitType: soloMatch ? 'solo' : 'equal',
      approximated: !soloMatch && !equalMatch,
    })
  }

  return { expenses, settlements, skipped }
}

export interface ImportSummary {
  expenses: number
  settlements: number
  skipped: number
  approximated: number
  fallbackCategories: string[]
}

/**
 * Writes the parsed rows to Firestore. Categories are resolved by leaf name
 * (case-insensitive) against the live category tree, since a raw Splitwise
 * export has one flat category per row, not this app's group/sub hierarchy.
 * Duplicate leaf names (e.g. "Other" under multiple groups) resolve to
 * whichever matches first; anything unmatched falls back to Uncategorized >
 * General so nothing is dropped. Requires the category tree to be seeded
 * already.
 */
export async function writeSplitwiseImport(
  parsed: ParseResult,
  users: [SeedUser, SeedUser],
): Promise<ImportSummary> {
  const snapshot = await getDocs(collections.categories)
  if (snapshot.empty) {
    throw new Error('No categories found. Seed the database before importing.')
  }
  const cats = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Category, 'id'>),
  }))
  const general = cats.find((c) => c.parentId !== null && c.name === 'General')
  if (!general) {
    throw new Error('Uncategorized > General is missing; cannot import.')
  }

  const byName = new Map<string, string>()
  for (const c of cats) {
    if (c.parentId === null) continue
    const key = c.name.toLowerCase()
    if (!byName.has(key)) byName.set(key, c.id)
  }

  const fallbackCategories = new Set<string>()
  const resolveCategory = (name: string): string => {
    const id = byName.get(name.toLowerCase())
    if (id) return id
    fallbackCategories.add(name || '(blank)')
    return general.id
  }

  const uidFor = (p: 'a' | 'b') => (p === 'a' ? users[0].uid : users[1].uid)

  let batch = writeBatch(db)
  let pending = 0
  const flushIfFull = async () => {
    if (pending >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit()
      batch = writeBatch(db)
      pending = 0
    }
  }

  let approximated = 0
  for (const e of parsed.expenses) {
    await flushIfFull()
    if (e.approximated) approximated++
    batch.set(doc(collections.expenses), {
      amount: e.amount,
      description: e.description,
      categoryId: resolveCategory(e.categoryName),
      paidBy: uidFor(e.paidBy),
      splitType: e.splitType,
      date: e.date,
      // Historical rows: stamp createdAt from the expense date so ordering by
      // creation roughly matches the real timeline (display sorts by `date`).
      createdAt: Timestamp.fromDate(new Date(`${e.date}T00:00:00Z`)),
    })
    pending++
  }

  for (const s of parsed.settlements) {
    await flushIfFull()
    batch.set(doc(collections.settlements), {
      fromUser: uidFor(s.from),
      toUser: uidFor(s.to),
      amount: s.amount,
      date: s.date,
    })
    pending++
  }

  if (pending > 0) await batch.commit()

  return {
    expenses: parsed.expenses.length,
    settlements: parsed.settlements.length,
    skipped: parsed.skipped,
    approximated,
    fallbackCategories: [...fallbackCategories],
  }
}
