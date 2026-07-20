import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import type { DayPoint } from '@/lib/stats'
import { ChartTooltip } from '@/components/stats/ChartTooltip'

// Two cumulative spend lines, one per person, across the days of the selected
// month. A legend (below) names each line so the two colors aren't the only cue.
export function CumulativeLineChart({
  data,
  meName,
  partnerName,
  meColor,
  partnerColor,
}: {
  data: DayPoint[]
  meName: string
  partnerName: string
  meColor: string
  partnerColor: string
}) {
  const lastDay = data.length
  // A handful of evenly spaced day ticks, always including the last day.
  const ticks = [1, 5, 10, 15, 20, 25].filter((d) => d < lastDay)
  if (lastDay > 0) ticks.push(lastDay)

  return (
    <div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="day"
              type="number"
              domain={[1, lastDay]}
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
            <Tooltip
              content={
                <ChartTooltip labelFormatter={(d) => `Day ${d}`} />
              }
            />
            <Line
              type="monotone"
              dataKey="me"
              name={meName}
              stroke={meColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="partner"
              name={partnerName}
              stroke={partnerColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-5 text-xs text-muted-foreground">
        <LegendDot color={meColor} label={meName} />
        <LegendDot color={partnerColor} label={partnerName} />
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
