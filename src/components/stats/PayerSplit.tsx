import { formatCurrency } from '@/lib/format'
import type { UserProfile } from '@/lib/types'

// Who paid how much this period: a total per person plus a single proportion
// bar showing the split between them.
export function PayerSplit({
  me,
  partner,
  meTotal,
  partnerTotal,
}: {
  me: UserProfile | null
  partner: UserProfile | null
  meTotal: number
  partnerTotal: number
}) {
  const total = meTotal + partnerTotal
  const mePct = total > 0 ? (meTotal / total) * 100 : 50
  const meColor = me?.colorTag ?? 'var(--primary)'
  const partnerColor = partner?.colorTag ?? '#f59e0b'

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <PayerTile
          name={me ? 'You' : '-'}
          amount={meTotal}
          color={meColor}
        />
        <PayerTile
          name={partner?.name ?? 'Partner'}
          amount={partnerTotal}
          color={partnerColor}
        />
      </div>

      {total > 0 && (
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            style={{ width: `${mePct}%`, backgroundColor: meColor }}
            className="h-full"
          />
          <div
            style={{ width: `${100 - mePct}%`, backgroundColor: partnerColor }}
            className="h-full"
          />
        </div>
      )}
    </div>
  )
}

function PayerTile({
  name,
  amount,
  color,
}: {
  name: string
  amount: number
  color: string
}) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <div className="flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-muted-foreground">{name}</span>
      </div>
      <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
        {formatCurrency(amount)}
      </p>
    </div>
  )
}
