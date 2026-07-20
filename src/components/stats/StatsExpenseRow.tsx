import { dayNumber, formatCurrency, monthAbbrev } from '@/lib/format'
import { CategoryIcon } from '@/lib/icons'
import type { Expense, UserProfile } from '@/lib/types'

// The Stats list row. Unlike the Home row (which frames each expense as
// lent/borrowed against the balance), this shows the full amount plus the
// category and who paid, since Stats is about total spend, not the split.
export function StatsExpenseRow({
  expense,
  categoryLabel,
  categoryIcon,
  categoryColor,
  payer,
  me,
  onClick,
}: {
  expense: Expense
  categoryLabel: string
  categoryIcon: string | undefined
  categoryColor: string | undefined
  payer: UserProfile | undefined
  me: UserProfile | null
  onClick?: () => void
}) {
  const paidLabel = payer ? (me && payer.id === me.id ? 'You' : payer.name) : '-'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 p-3 text-left transition-colors enabled:hover:bg-muted enabled:active:bg-muted"
    >
      <div className="w-8 shrink-0 text-center">
        <div className="text-xs text-muted-foreground">
          {monthAbbrev(expense.date)}
        </div>
        <div className="text-base font-semibold leading-tight">
          {dayNumber(expense.date)}
        </div>
      </div>

      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-neutral-800"
        style={{ backgroundColor: categoryColor ?? 'var(--muted)' }}
      >
        <CategoryIcon name={categoryIcon} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{expense.description}</p>
        <p className="truncate text-sm text-muted-foreground">
          {categoryLabel} · {paidLabel}
          {expense.splitType === 'solo' ? ' · solo' : ''}
        </p>
      </div>

      <div className="shrink-0 text-right font-semibold tabular-nums">
        {formatCurrency(expense.amount)}
      </div>
    </button>
  )
}
