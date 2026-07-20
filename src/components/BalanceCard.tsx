import { Confetti } from '@phosphor-icons/react'
import { fromCents } from '@/lib/balance'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/lib/types'
import { SettleUpButton } from '@/components/SettleUpButton'

// A bold, saturated hero card that matches the row colors: green when you're
// owed (like "you lent"), orange when you owe (like "you borrowed"), neutral
// when settled. White text and a white button so it pops off the muted page.
const THEME = {
  owed: {
    card: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-600/25 dark:from-emerald-500 dark:to-emerald-700',
    label: 'text-white/85',
    button: 'bg-white text-emerald-700 hover:bg-emerald-50',
  },
  owe: {
    card: 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg shadow-orange-500/25 dark:from-orange-500 dark:to-orange-600',
    label: 'text-white/85',
    button: 'bg-white text-orange-700 hover:bg-orange-50',
  },
}

// `netCents` is from the logged-in user's perspective: positive = partner owes
// me, negative = I owe partner, zero = settled up.
export function BalanceCard({
  me,
  partner,
  netCents,
}: {
  me: UserProfile | null
  partner: UserProfile | null
  netCents: number
}) {
  const settled = netCents === 0
  const iOwe = netCents < 0
  const amount = fromCents(Math.abs(netCents))
  const theme = iOwe ? THEME.owe : THEME.owed

  if (settled) {
    return (
      <div className="flex min-h-[50svh] flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),#000_16%)] p-6 text-center text-white shadow-lg shadow-primary/30">
        <Confetti size={80} weight="fill" className="drop-shadow" />
        <p className="font-heading text-5xl font-bold tracking-tight drop-shadow-sm">
          You're all settled up
        </p>
        <p className="text-lg text-white/90">Nothing owed either way. Nice.</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-3xl p-6 text-center', theme.card)}>
      <p className={cn('text-sm font-medium', theme.label)}>
        {iOwe
          ? `You owe ${partner?.name ?? 'your partner'}`
          : `${partner?.name ?? 'Your partner'} owes you`}
      </p>
      <p className="mt-1 font-heading text-6xl font-bold tracking-tight text-white drop-shadow-sm">
        {formatCurrency(amount)}
      </p>
      {me && partner && (
        <SettleUpButton
          me={me}
          partner={partner}
          netCents={netCents}
          className={theme.button}
        />
      )}
    </div>
  )
}
