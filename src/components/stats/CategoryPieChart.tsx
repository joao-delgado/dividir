import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { CaretRight } from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/format'
import type { CategorySlice } from '@/lib/stats'

// Spend by top-level category as a donut, with the period total in the hole and
// a legend below carrying name + amount + share. Identity is never color-alone:
// every slice is named in the legend (see dataviz interaction rules). Legend rows
// are tappable to drill into a single category's subcategories and expenses.
export function CategoryPieChart({
  slices,
  onSelectSlice,
}: {
  slices: CategorySlice[]
  onSelectSlice?: (slice: CategorySlice) => void
}) {
  const total = slices.reduce((sum, s) => sum + s.total, 0)

  return (
    <div>
      <div className="relative mx-auto h-52 w-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={64}
              outerRadius={96}
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {slices.map((s) => (
                <Cell key={s.id} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="font-heading text-xl font-bold tracking-tight">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-1">
        {slices.map((s) => {
          const share = total > 0 ? Math.round((s.total / total) * 100) : 0
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelectSlice?.(s)}
                disabled={!onSelectSlice}
                className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors enabled:hover:bg-muted enabled:active:bg-muted"
              >
                <span
                  className="size-3 shrink-0 rounded-full ring-1 ring-black/5"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                  {share}%
                </span>
                <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                  {formatCurrency(s.total)}
                </span>
                {onSelectSlice && (
                  <CaretRight
                    size={14}
                    className="shrink-0 text-muted-foreground"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
