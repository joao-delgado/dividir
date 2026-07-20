import { formatCurrency } from '@/lib/format'
import { CategoryIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { Subscription } from '@/lib/types'

export function SubscriptionRow({
  subscription,
  onClick,
}: {
  subscription: Subscription
  onClick?: () => void
}) {
  const { name, amount, cycle, icon, colorTag, active } = subscription

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex w-full items-center gap-3 p-3 text-left transition-colors enabled:hover:bg-muted enabled:active:bg-muted',
        !active && 'opacity-50',
      )}
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-neutral-800"
        style={{ backgroundColor: colorTag }}
      >
        <CategoryIcon name={icon} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {name}
          {!active && (
            <span className="text-muted-foreground"> (paused)</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-semibold">{formatCurrency(amount)}</p>
        <p className="text-xs text-muted-foreground">
          {cycle === 'monthly' ? '/mo' : '/yr'}
        </p>
      </div>
    </button>
  )
}
