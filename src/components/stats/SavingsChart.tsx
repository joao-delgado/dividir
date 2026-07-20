import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/format'
import { monthYearLabel } from '@/lib/format'
import type { SavingsBucket } from '@/lib/savingsStats'

// Grouped bars, one pair per month: how much each person saved. Negative months
// (overspent) dip below the zero line. A null amount means that person hasn't
// logged the month, so no bar is drawn for them there.
export function SavingsChart({
  data,
  meName,
  partnerName,
  meColor,
  partnerColor,
}: {
  data: SavingsBucket[]
  meName: string
  partnerName: string
  meColor: string
  partnerColor: string
}) {
  const hasData = data.some((d) => d.meAmount !== null || d.partnerAmount !== null)

  if (!hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nothing logged for this stretch.
      </p>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <Legend color={meColor} label={meName} />
        <Legend color={partnerColor} label={partnerName} />
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              interval={0}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Tooltip
              cursor={{ fill: 'var(--muted)', radius: 8 }}
              content={
                <SavingsTooltip meName={meName} partnerName={partnerName} />
              }
            />
            <Bar dataKey="meAmount" name={meName} radius={3} maxBarSize={18}>
              {data.map((d) => (
                <Cell key={d.key} fill={meColor} />
              ))}
            </Bar>
            <Bar dataKey="partnerAmount" name={partnerName} radius={3} maxBarSize={18}>
              {data.map((d) => (
                <Cell key={d.key} fill={partnerColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-full ring-1 ring-black/5"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

interface TooltipEntry {
  payload: SavingsBucket
}

function SavingsTooltip({
  active,
  payload,
  meName,
  partnerName,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  meName: string
  partnerName: string
}) {
  if (!active || !payload?.length) return null
  const bucket = payload[0].payload

  return (
    <div className="rounded-xl bg-popover px-3 py-2 text-sm shadow-md ring-1 ring-border">
      <p className="mb-1 font-medium">{monthYearLabel(`${bucket.key}-01`)}</p>
      {bucket.meAmount !== null && (
        <p className="text-muted-foreground">
          {meName}: <span className="tabular-nums">{formatCurrency(bucket.meAmount)}</span>
        </p>
      )}
      {bucket.partnerAmount !== null && (
        <p className="text-muted-foreground">
          {partnerName}:{' '}
          <span className="tabular-nums">{formatCurrency(bucket.partnerAmount)}</span>
        </p>
      )}
    </div>
  )
}
