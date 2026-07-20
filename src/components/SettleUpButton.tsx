import { useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { fromCents } from '@/lib/balance'
import { formatCurrency } from '@/lib/format'
import { todayStr } from '@/lib/format'
import { addSettlement } from '@/lib/firestore'
import type { UserProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// Matches the BalanceCard palette so the dialog reads as the same moment: green
// when someone owes you (you're being paid), orange when you owe (you're paying).
const THEME = {
  owed: {
    hero: 'bg-gradient-to-br from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700',
    action: 'bg-emerald-500 text-white hover:bg-emerald-600',
  },
  owe: {
    hero: 'bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600',
    action: 'bg-orange-500 text-white hover:bg-orange-600',
  },
}

// One avatar in the pay-flow: the uploaded photo if there is one, otherwise the
// person's initial on their color tag. A white ring lifts it off the gradient.
function FlowAvatar({ user }: { user: UserProfile }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="size-16 overflow-hidden rounded-full ring-4 ring-white/70 shadow-md">
        {user.avatarBase64 ? (
          <img src={user.avatarBase64} alt="" className="size-full object-cover" />
        ) : (
          <span
            className="flex size-full items-center justify-center text-2xl font-semibold text-foreground/80"
            style={{ backgroundColor: user.colorTag }}
          >
            {user.name.charAt(0)}
          </span>
        )}
      </div>
      <span className="max-w-24 truncate text-lg font-semibold text-white">
        {user.name}
      </span>
    </div>
  )
}

// `netCents` is from the logged-in user's perspective: positive = partner owes
// me, negative = I owe partner. Never rendered when zero (nothing to settle).
export function SettleUpButton({
  me,
  partner,
  netCents,
  className,
}: {
  me: UserProfile
  partner: UserProfile
  netCents: number
  className?: string
}) {
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const amount = fromCents(Math.abs(netCents))
  const iOwe = netCents < 0
  const fromUser = iOwe ? me.id : partner.id
  const toUser = iOwe ? partner.id : me.id

  // The payer sits on the left, the arrow points to whoever gets paid.
  const payer = iOwe ? me : partner
  const receiver = iOwe ? partner : me
  const theme = iOwe ? THEME.owe : THEME.owed

  const confirm = async () => {
    setSaving(true)
    try {
      await addSettlement({ fromUser, toUser, amount, date: todayStr() })
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button size="lg" className={cn('mt-5 w-full font-semibold', className)}>
            Settle up
          </Button>
        }
      />
      <AlertDialogContent className="overflow-hidden p-0">
        {/* Colored hero mirroring the balance card: payer -> receiver with the
            amount riding the arrow between them. */}
        <div className={cn('px-6 pb-10 pt-12 text-center', theme.hero)}>
          <div className="flex items-center justify-center gap-4">
            <FlowAvatar user={payer} />
            <div className="flex flex-col items-center gap-1.5 pb-8">
              <ArrowRight
                size={30}
                weight="bold"
                className="text-white/90 drop-shadow-sm"
              />
            </div>
            <FlowAvatar user={receiver} />
          </div>
        </div>

        <div className="px-6 pb-6">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {payer.name} pays {receiver.name} {formatCurrency(amount)}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-snug">
              This clears the current list and starts fresh. You can undo it right
              after if it was a mistake.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5">
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm}
              disabled={saving}
              className={theme.action}
            >
              {saving ? 'Settling...' : 'Settle up'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
