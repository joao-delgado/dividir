import { rowSplit } from '@/lib/balance'
import { dayNumber, formatCurrency, monthAbbrev } from '@/lib/format'
import { CategoryIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { Expense, UserProfile } from '@/lib/types'

// One expense row in the Splitwise style: stacked date, colored category-icon
// square, description + "who paid" subline, and the lent/borrowed amount.
export function ExpenseRow({
  expense,
  me,
  partner,
  categoryIcon,
  categoryColor,
  onClick,
}: {
  expense: Expense
  me: UserProfile | null
  partner: UserProfile | null
  categoryIcon: string | undefined
  categoryColor: string | undefined
  onClick?: () => void
}) {
  const paidByMe = me ? expense.paidBy === me.id : false
  const paidLabel = paidByMe ? 'You' : (partner?.name ?? 'Partner')
  const split = me
    ? rowSplit(expense, me.id)
    : { direction: 'lent' as const, amount: 0 }
  const lent = split.direction === 'lent'
  const amountColor = lent ? 'text-emerald-600' : 'text-orange-600'

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
          {paidLabel} paid {formatCurrency(expense.amount)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <div className={cn('text-xs', amountColor)}>
          {lent ? 'you lent' : 'you borrowed'}
        </div>
        <div className={cn('font-semibold', amountColor)}>
          {formatCurrency(split.amount)}
        </div>
      </div>
    </button>
  )
}
