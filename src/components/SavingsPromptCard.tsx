import { useState } from 'react'
import { PiggyBank, X } from '@phosphor-icons/react'
import { monthYearLabel, parseAmount } from '@/lib/format'
import { setSaving } from '@/lib/firestore'
import { SavedOverToggle } from '@/components/SavedOverToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UserProfile } from '@/lib/types'

// A dismissible nudge at the top of Home, shown at the start of a new month to
// log how much you saved in the month that just ended. It renders only while
// there's no entry yet for that month and you haven't dismissed it. Dismissal is
// remembered locally per user and month, so it stays gone until next month.
const dismissKey = (userId: string, month: string) =>
  `dividir:savings-dismissed:${userId}:${month}`

function isDismissed(userId: string, month: string): boolean {
  try {
    return localStorage.getItem(dismissKey(userId, month)) === '1'
  } catch {
    return false
  }
}

export function SavingsPromptCard({
  me,
  monthKey,
}: {
  me: UserProfile
  monthKey: string // "2026-06", the month that just ended
}) {
  const [dismissed, setDismissed] = useState(() => isDismissed(me.id, monthKey))
  const [sign, setSign] = useState<'saved' | 'over'>('saved')
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (dismissed) return null

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(me.id, monthKey), '1')
    } catch {
      // Private mode / storage full: just hide it for this session.
    }
    setDismissed(true)
  }

  const save = async () => {
    const value = parseAmount(raw)
    if (value === null) {
      setError("That doesn't look like a number")
      return
    }
    setBusy(true)
    setError(null)
    // The toggle owns the sign, so use the magnitude of whatever was typed.
    const amount = sign === 'over' ? -Math.abs(value) : Math.abs(value)
    try {
      await setSaving(me.id, monthKey, amount)
      // Once the snapshot reports the new entry, Home stops rendering this card,
      // so there's no success state to reset here.
    } catch {
      setError("Couldn't save that. Try again?")
      setBusy(false)
    }
  }

  return (
    <div className="relative mb-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X size={18} />
      </button>

      <div className="flex items-center gap-2 pr-6">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: me.colorTag }}
        >
          <PiggyBank size={20} weight="fill" className="text-neutral-800" />
        </span>
        <div className="min-w-0">
          <p className="font-medium">How did {monthYearLabel(`${monthKey}-01`)} go?</p>
          <p className="text-sm text-muted-foreground">
            Log what you put aside.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <SavedOverToggle value={sign} onChange={setSign} />
        <div className="relative flex-1">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) save()
            }}
            className="pr-7 text-right"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            €
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <Button
        className="mt-3 w-full"
        onClick={save}
        disabled={busy || raw.trim() === ''}
      >
        {busy ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}
