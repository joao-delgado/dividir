import type { Subscription, UserId } from '@/lib/types'

/** A subscription's cost expressed as a monthly figure (yearly ÷ 12). */
export function monthlyAmount(sub: Subscription): number {
  return sub.cycle === 'yearly' ? sub.amount / 12 : sub.amount
}

/**
 * Whether `meId` should see this subscription: shared subs are visible to both,
 * solo subs only to their owner. This is a display filter, not a security
 * boundary (the current Firestore rules let both accounts read every doc).
 */
export function isVisibleTo(sub: Subscription, meId: UserId): boolean {
  return sub.splitType === 'equal' || sub.owner === meId
}

export interface SubscriptionTotals {
  /** Full monthly cost of all active shared subs (before splitting). */
  sharedMonthly: number
  /** My half of the shared monthly cost. */
  sharedMineMonthly: number
  /** Monthly cost of my active solo subs. */
  soloMonthly: number
  /** What I actually spend per month: my half of shared + my solo. */
  myMonthly: number
}

/**
 * Totals from my perspective. `shared` and `solo` should already be filtered to
 * what I can see; paused subs are excluded from the figures.
 */
export function subscriptionTotals(
  shared: Subscription[],
  solo: Subscription[],
): SubscriptionTotals {
  const sum = (subs: Subscription[]) =>
    subs.filter((s) => s.active).reduce((acc, s) => acc + monthlyAmount(s), 0)

  const sharedMonthly = sum(shared)
  const soloMonthly = sum(solo)
  const sharedMineMonthly = sharedMonthly / 2

  return {
    sharedMonthly,
    sharedMineMonthly,
    soloMonthly,
    myMonthly: sharedMineMonthly + soloMonthly,
  }
}
