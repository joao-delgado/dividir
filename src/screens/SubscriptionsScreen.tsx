import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, CircleNotch } from '@phosphor-icons/react'
import { useUsers } from '@/lib/users'
import { subscribeSubscriptions } from '@/lib/firestore'
import { isVisibleTo, subscriptionTotals } from '@/lib/subscriptions'
import { formatCurrency } from '@/lib/format'
import type { Subscription } from '@/lib/types'
import { SubscriptionRow } from '@/components/SubscriptionRow'
import { Button } from '@/components/ui/button'

export default function SubscriptionsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { me } = useUsers()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Page-scoped listener: subscriptions are only needed here.
    return subscribeSubscriptions((next) => {
      setSubscriptions(next)
      setLoading(false)
    })
  }, [])

  const { shared, solo } = useMemo(() => {
    const visible = me
      ? subscriptions.filter((s) => isVisibleTo(s, me.id))
      : []
    return {
      shared: visible.filter((s) => s.splitType === 'equal'),
      solo: visible.filter((s) => s.splitType === 'solo'),
    }
  }, [subscriptions, me])

  const totals = useMemo(
    () => subscriptionTotals(shared, solo),
    [shared, solo],
  )

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky -top-px z-10">
        <header className="flex items-center justify-between bg-muted px-4 pt-[calc(var(--spacing)*4+1px)] pb-2">
          <h1 className="font-heading text-2xl font-semibold">Subscriptions</h1>
          <Button
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90"
            onClick={() =>
              navigate('/subscriptions/add', {
                state: { backgroundLocation: location },
              })
            }
          >
            <Plus weight="bold" /> Add
          </Button>
        </header>
        <div className="h-4 bg-linear-to-b from-muted to-muted/0" />
      </div>

      <div className="px-4 pb-24">
        <SummaryCard
          myMonthly={totals.myMonthly}
          sharedMineMonthly={totals.sharedMineMonthly}
          soloMonthly={totals.soloMonthly}
        />

        {loading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <CircleNotch size={24} className="animate-spin" />
          </div>
        ) : shared.length === 0 && solo.length === 0 ? (
          <p className="px-1 pt-8 text-center text-sm text-muted-foreground">
            No subscriptions yet. Add the services you pay for.
          </p>
        ) : (
          <>
            <Section
              title="Shared"
              subs={shared}
              onSelect={(id) =>
                navigate(`/subscriptions/${id}`, {
                  state: { backgroundLocation: location },
                })
              }
            />
            <Section
              title="Your subscriptions"
              subs={solo}
              onSelect={(id) =>
                navigate(`/subscriptions/${id}`, {
                  state: { backgroundLocation: location },
                })
              }
            />
          </>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  myMonthly,
  sharedMineMonthly,
  soloMonthly,
}: {
  myMonthly: number
  sharedMineMonthly: number
  soloMonthly: number
}) {
  return (
    <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border">
      <p className="text-center text-sm text-muted-foreground">
        Your subscriptions
      </p>
      <p className="mt-1 text-center font-heading text-4xl font-bold tracking-tight">
        {formatCurrency(myMonthly)}
        <span className="text-lg font-medium text-muted-foreground"> /mo</span>
      </p>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        about {formatCurrency(myMonthly * 12)} a year
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Shared (your half)" value={sharedMineMonthly} />
        <Stat label="Solo" value={soloMonthly} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted p-3 text-center">
      <p className="font-semibold">{formatCurrency(value)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Section({
  title,
  subs,
  onSelect,
}: {
  title: string
  subs: Subscription[]
  onSelect: (id: string) => void
}) {
  if (subs.length === 0) return null
  return (
    <section>
      <h2 className="px-1 pt-5 pb-2 text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
        {subs.map((s) => (
          <SubscriptionRow
            key={s.id}
            subscription={s}
            onClick={() => onSelect(s.id)}
          />
        ))}
      </div>
    </section>
  )
}
