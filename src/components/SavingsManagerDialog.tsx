import { useState } from 'react'
import { CaretLeft, CaretRight, CircleNotch, Trash } from '@phosphor-icons/react'
import { monthAbbrev, monthYearLabel, parseAmount } from '@/lib/format'
import { deleteSaving, setSaving } from '@/lib/firestore'
import { useSavings } from '@/lib/savings'
import {
  isFutureMonth,
  lastCompletedMonthKey,
  monthKeysOfYear,
  savingFor,
} from '@/lib/savingsStats'
import { cn } from '@/lib/utils'
import type { Saving, UserProfile } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SavedOverToggle } from '@/components/SavedOverToggle'

// A compact euro figure for the month tiles, e.g. "500 €". Full precision lives
// in the editor below the grid.
const compactEur = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

// Manage your logged savings as a year calendar: a tile per month, tinted green
// when you saved and orange when you went over. Tap a month to log, edit, or
// clear it. Editing is scoped to your own numbers (each person logs their own).
export function SavingsManagerDialog({
  me,
  open,
  onOpenChange,
}: {
  me: UserProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { savings } = useSavings()
  const maxYear = Number(lastCompletedMonthKey().slice(0, 4))
  const [year, setYear] = useState(maxYear)
  const [selected, setSelected] = useState<string | null>(null)

  const months = monthKeysOfYear(year)

  const goToYear = (next: number) => {
    setYear(next)
    setSelected(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Your savings</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tap a month to log what you put aside. Green is saved, orange is
            overspent.
          </p>
        </DialogHeader>

        {/* Year navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous year"
            onClick={() => goToYear(year - 1)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {year}
          </span>
          <button
            type="button"
            aria-label="Next year"
            onClick={() => goToYear(year + 1)}
            disabled={year >= maxYear}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-2">
          {months.map((month) => {
            const entry = savingFor(savings, me.id, month)
            const future = isFutureMonth(month)
            const isSelected = month === selected
            const tone =
              entry === undefined
                ? 'none'
                : entry.amount < 0
                  ? 'over'
                  : 'saved'
            return (
              <button
                key={month}
                type="button"
                disabled={future}
                onClick={() => setSelected(isSelected ? null : month)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-2xl py-3 ring-1 transition-colors',
                  tone === 'saved' &&
                    'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900',
                  tone === 'over' &&
                    'bg-orange-50 ring-orange-200 dark:bg-orange-950/40 dark:ring-orange-900',
                  tone === 'none' && 'bg-muted ring-transparent',
                  isSelected && 'ring-2 ring-foreground',
                  future && 'opacity-40',
                )}
              >
                <span className="text-sm font-medium">
                  {monthAbbrev(`${month}-01`)}
                </span>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    tone === 'saved' &&
                      'text-emerald-700 dark:text-emerald-400',
                    tone === 'over' && 'text-orange-700 dark:text-orange-400',
                    tone === 'none' && 'text-muted-foreground',
                  )}
                >
                  {entry ? compactEur.format(entry.amount) : '-'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Editor for the tapped month */}
        {selected && (
          <MonthEditor
            key={selected}
            month={selected}
            userId={me.id}
            existing={savingFor(savings, me.id, selected)}
            onDone={() => setSelected(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MonthEditor({
  month,
  userId,
  existing,
  onDone,
}: {
  month: string
  userId: string
  existing: Saving | undefined
  onDone: () => void
}) {
  const [sign, setSign] = useState<'saved' | 'over'>(
    existing && existing.amount < 0 ? 'over' : 'saved',
  )
  const [raw, setRaw] = useState(
    existing ? String(Math.abs(existing.amount)).replace('.', ',') : '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const value = parseAmount(raw)
    if (value === null) {
      setError("That doesn't look like a number")
      return
    }
    setBusy(true)
    setError(null)
    const amount = sign === 'over' ? -Math.abs(value) : Math.abs(value)
    try {
      await setSaving(userId, month, amount)
      onDone()
    } catch {
      setError("Couldn't save that. Try again?")
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!existing) {
      onDone()
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteSaving(existing.id)
      onDone()
    } catch {
      setError("Couldn't delete that. Try again?")
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl bg-muted/50 p-4 ring-1 ring-border">
      <p className="mb-3 font-medium">{monthYearLabel(`${month}-01`)}</p>

      <div className="flex items-center gap-2">
        <SavedOverToggle value={sign} onChange={setSign} />
        <div className="relative flex-1">
          <Input
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) save()
            }}
            className="bg-card pr-7 text-right"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            €
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <Button
          className="flex-1"
          onClick={save}
          disabled={busy || raw.trim() === ''}
        >
          {busy ? <CircleNotch size={16} className="animate-spin" /> : 'Save'}
        </Button>
        {existing && (
          <Button
            variant="outline"
            size="icon"
            aria-label="Delete"
            onClick={remove}
            disabled={busy}
          >
            <Trash size={18} className="text-destructive" />
          </Button>
        )}
      </div>
    </div>
  )
}
