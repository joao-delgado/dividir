import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CircleNotch } from '@phosphor-icons/react'
import { useUsers } from '@/lib/users'
import { useCategories } from '@/lib/categories'
import { useLedger } from '@/lib/ledger'
import { expensesInSettlement, isMostRecentSettlement } from '@/lib/balance'
import { deleteSettlement } from '@/lib/firestore'
import { formatCurrency, fullDate } from '@/lib/format'
import { resolveCategoryColor } from '@/lib/categoryTree'
import { ExpenseRow } from '@/components/ExpenseRow'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Settlement } from '@/lib/types'

export default function SettlementsHistoryScreen() {
  const navigate = useNavigate()
  const { me, partner, users } = useUsers()
  const { byId } = useCategories()
  const { expenses, settlements, loading } = useLedger()

  const [selected, setSelected] = useState<Settlement | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Focus anchor at the top so the modal opens scrolled to the top, not jumped
  // down to the first enabled control (the Unsettle button).
  const topRef = useRef<HTMLDivElement>(null)

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? 'Someone'

  // Group settlements by year (already date-desc from the query).
  const groups = useMemo(() => {
    const map = new Map<string, Settlement[]>()
    for (const s of settlements) {
      const year = s.date.slice(0, 4)
      const list = map.get(year)
      if (list) list.push(s)
      else map.set(year, [s])
    }
    return [...map.entries()].map(([year, items]) => ({ year, items }))
  }, [settlements])

  function openSettlement(s: Settlement) {
    setSelected(s)
    setConfirming(false)
  }

  async function handleUnsettle() {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteSettlement(selected.id)
      setSelected(null)
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  const selectedExpenses = selected
    ? expensesInSettlement(expenses, settlements, selected)
    : []
  const canUnsettle = selected
    ? isMostRecentSettlement(settlements, selected)
    : false

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky -top-px z-10">
        <header className="flex items-center gap-3 bg-muted px-4 pt-[calc(var(--spacing)*4+1px)] pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-heading text-2xl font-semibold">
            Settlement history
          </h1>
        </header>
        <div className="h-4 bg-linear-to-b from-muted to-muted/0" />
      </div>

      <div className="px-4 pb-24">
        {loading && settlements.length === 0 ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <CircleNotch size={24} className="animate-spin" />
          </div>
        ) : settlements.length === 0 ? (
          <p className="px-1 pt-8 text-center text-sm text-muted-foreground">
            No settlements yet. When you settle up, it shows here.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.year}>
              <h2 className="px-1 pt-5 pb-2 text-sm font-medium text-muted-foreground">
                {group.year}
              </h2>
              <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
                {group.items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openSettlement(s)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{fullDate(s.date)}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {nameOf(s.fromUser)} paid {nameOf(s.toUser)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {formatCurrency(s.amount)}
                    </p>
                    <ArrowRight
                      size={18}
                      className="shrink-0 text-muted-foreground"
                    />
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null)
        }}
      >
        <DialogContent
          className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto"
          initialFocus={topRef}
        >
          <div ref={topRef} tabIndex={-1} className="sr-only" />
          <DialogHeader>
            <DialogTitle className="text-lg">
              Settled {selected ? formatCurrency(selected.amount) : ''}
            </DialogTitle>
            {selected && (
              <p className="text-sm text-muted-foreground">
                {fullDate(selected.date)}, {nameOf(selected.fromUser)} paid{' '}
                {nameOf(selected.toUser)}
              </p>
            )}
          </DialogHeader>

          {selectedExpenses.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No expenses were on this settlement.
            </p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
              {selectedExpenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  me={me}
                  partner={partner}
                  categoryIcon={byId.get(expense.categoryId)?.icon}
                  categoryColor={resolveCategoryColor(
                    byId,
                    byId.get(expense.categoryId),
                  )}
                />
              ))}
            </div>
          )}

          {canUnsettle ? (
            confirming ? (
              <div className="flex flex-col gap-3 rounded-3xl border border-border bg-muted/40 p-4">
                <p className="text-center text-sm text-muted-foreground">
                  Undo this settlement? These expenses go back to your open list.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="flex-1"
                    onClick={handleUnsettle}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <CircleNotch size={18} className="animate-spin" />
                    ) : (
                      'Unsettle'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => setConfirming(true)}
              >
                Unsettle
              </Button>
            )
          ) : (
            <p className="px-1 text-center text-xs text-muted-foreground">
              Only your most recent settlement can be undone.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
