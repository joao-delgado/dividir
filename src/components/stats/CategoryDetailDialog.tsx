import { useMemo, useRef } from 'react'
import { resolveCategoryColor } from '@/lib/categoryTree'
import { formatCurrency } from '@/lib/format'
import { categoryDetail, type CategorySlice } from '@/lib/stats'
import type { Category, Expense, UserProfile } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatsExpenseRow } from '@/components/stats/StatsExpenseRow'

// Drill-down for a single pie slice: what a top-level category was actually spent
// on, broken down by subcategory, then the individual expenses. Opens from the
// pie legend on the Stats screen.
export function CategoryDetailDialog({
  slice,
  periodLabel,
  expenses,
  byId,
  users,
  me,
  onOpenChange,
  onSelectExpense,
}: {
  slice: CategorySlice | null
  periodLabel: string
  expenses: Expense[]
  byId: Map<string, Category>
  users: UserProfile[]
  me: UserProfile | null
  onOpenChange: (open: boolean) => void
  onSelectExpense: (expense: Expense) => void
}) {
  // Hold onto the last slice so the content stays put while the modal animates
  // out (the controlled `slice` goes null the instant it's closed).
  const lastSlice = useRef<CategorySlice | null>(null)
  if (slice) lastSlice.current = slice
  const shown = slice ?? lastSlice.current

  const detail = useMemo(
    () => (shown ? categoryDetail(expenses, byId, shown.id) : null),
    [shown, expenses, byId],
  )

  return (
    <Dialog open={slice !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto">
        <DialogHeader className="min-w-0 pr-8">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-3.5 shrink-0 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: shown?.color }}
            />
            <DialogTitle className="truncate text-lg">{shown?.name}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {periodLabel} · {formatCurrency(detail?.total ?? 0)}
          </p>
        </DialogHeader>

        {detail && (
          <>
            {/* Subcategory breakdown */}
            <div className="min-w-0 space-y-2">
              {detail.subcategories.map((sub) => {
                const share =
                  detail.total > 0
                    ? Math.round((sub.total / detail.total) * 100)
                    : 0
                return (
                  <div key={sub.id} className="min-w-0">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{sub.name}</span>
                      <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                        {share}%
                      </span>
                      <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                        {formatCurrency(sub.total)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: shown?.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Individual expenses */}
            <div className="min-w-0">
              <h3 className="px-1 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {detail.expenses.length}{' '}
                {detail.expenses.length === 1 ? 'expense' : 'expenses'}
              </h3>
              <div className="-mx-1 divide-y divide-border">
                {detail.expenses.map((e) => {
                  const cat = byId.get(e.categoryId)
                  return (
                    <StatsExpenseRow
                      key={e.id}
                      expense={e}
                      categoryLabel={cat?.name ?? 'Uncategorized'}
                      categoryIcon={cat?.icon}
                      categoryColor={resolveCategoryColor(byId, cat)}
                      payer={users.find((u) => u.id === e.paidBy)}
                      me={me}
                      onClick={() => onSelectExpense(e)}
                    />
                  )
                })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
