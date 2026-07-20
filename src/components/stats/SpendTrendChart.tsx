import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import type { MonthBucket } from '@/lib/stats'
import { ChartTooltip } from '@/components/stats/ChartTooltip'

// Total spend per month as a compact bar trend. The selected month (month view)
// is drawn in full primary; the surrounding context months are dimmed. In year
// view every bar is a month of the year, all at full strength.
export function SpendTrendChart({ data }: { data: MonthBucket[] }) {
  const hasData = data.some((d) => d.total > 0)
  // Year view has no single "selected" bar, so every month shows at full strength.
  const anySelected = data.some((d) => d.isSelected)

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            interval={0}
          />
          {hasData && (
            <Tooltip
              cursor={{ fill: 'var(--muted)', radius: 8 }}
              content={<ChartTooltip />}
            />
          )}
          <Bar dataKey="total" name="Spent" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill="var(--primary)"
                fillOpacity={!anySelected || entry.isSelected ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
