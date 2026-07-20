import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BudgetRow } from '@/lib/stats'

// Per-category budget vs actual for the month. Each row is a track filled to the
// spent share; going over budget fills the bar and turns the remainder label
// orange (same tone as "you borrowed" in the expense list).
export function BudgetVsActual({ rows }: { rows: BudgetRow[] }) {
  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const over = row.actual > row.budget
        const ratio = row.budget > 0 ? row.actual / row.budget : 0
        const pct = Math.min(ratio, 1) * 100
        const pctUsed = Math.round(ratio * 100)
        const diff = row.budget - row.actual
        return (
          <li key={row.categoryId}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 truncate">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="truncate font-medium">{row.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(row.actual)}{' '}
                <span className="text-muted-foreground/70">
                  / {formatCurrency(row.budget)}
                </span>
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', over && 'bg-orange-600')}
                style={{
                  width: `${over ? 100 : pct}%`,
                  backgroundColor: over ? undefined : row.color,
                }}
              />
            </div>

            <p
              className={cn(
                'mt-1 text-xs tabular-nums',
                over ? 'text-orange-600' : 'text-muted-foreground',
              )}
            >
              {over
                ? `${pctUsed}% used · ${formatCurrency(-diff)} over`
                : `${pctUsed}% used · ${formatCurrency(diff)} left`}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
