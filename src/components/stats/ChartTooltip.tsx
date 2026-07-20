import { formatCurrency } from '@/lib/format'

// A single tooltip style shared across the bar / line / pie charts, matching the
// app's card surface (rounded, hairline ring, soft shadow) rather than the
// default Recharts box. Recharts passes `active`, `payload`, and `label`.
interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  labelFormatter?: (label: string | number) => string
}) {
  if (!active || !payload || payload.length === 0) return null
  const heading =
    label != null
      ? labelFormatter
        ? labelFormatter(label)
        : String(label)
      : null

  return (
    <div className="rounded-xl bg-card px-3 py-2 shadow-md ring-1 ring-border">
      {heading && (
        <p className="mb-1 text-xs font-medium text-foreground">{heading}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            {entry.color && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            {entry.name && <span>{entry.name}</span>}
            <span className="ml-auto font-medium text-foreground">
              {typeof entry.value === 'number'
                ? formatCurrency(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
