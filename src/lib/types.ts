import type { Timestamp } from 'firebase/firestore'

// Domain types mirroring the Firestore data model (see CLAUDE.md).

export type UserId = string

export interface UserProfile {
  id: UserId // = Firebase Auth UID; ties an auth account to a name/color/avatar
  name: string // "João" or "Inês"
  colorTag: string
  avatarBase64: string | null
}

export interface Category {
  id: string
  name: string
  icon: string // Phosphor icon name
  colorTag: string // swatch color. Owned by the group (top-level); subcategories
  // inherit their parent's color at display time (see resolveCategoryColor).
  parentId: string | null // null = top-level, else references parent categoryId
  order: number // sort position among siblings (groups are drag-reorderable)
}

export interface Budget {
  id: string
  categoryId: string
  monthYear: string // "2026-07"
  amount: number
}

export interface Saving {
  id: string
  userId: UserId // whose savings this is (each person logs their own)
  monthYear: string // "2026-06", the month the amount was saved in
  amount: number // can be negative when the month was overspent
}

export type SplitType = 'equal' | 'solo'

export interface Expense {
  id: string
  amount: number
  description: string
  categoryId: string
  paidBy: UserId
  splitType: SplitType // 'equal' = 50/50; 'solo' = paidBy owed/owes the full amount
  date: string // "YYYY-MM-DD", date only
  createdAt: Timestamp
}

export interface Settlement {
  id: string
  fromUser: UserId
  toUser: UserId
  amount: number
  date: string // "YYYY-MM-DD"
}

export type SubscriptionCycle = 'monthly' | 'yearly'

export interface Subscription {
  id: string
  name: string
  amount: number
  cycle: SubscriptionCycle
  splitType: SplitType // 'equal' = shared 50/50; 'solo' = one person's
  owner: UserId // who created it; for solo subs, only the owner sees it
  icon: string // Phosphor icon name
  colorTag: string // swatch color for the list
  active: boolean // paused subs stay in the list but drop out of totals
  createdAt: Timestamp
}

// Input shapes for writes: the doc id and server-managed fields are omitted,
// since Firestore assigns the id and createdAt is stamped on write.
export type NewExpense = Omit<Expense, 'id' | 'createdAt'>
export type ExpenseUpdate = Partial<Omit<Expense, 'id' | 'createdAt'>>
export type NewCategory = Omit<Category, 'id'>
export type CategoryUpdate = Partial<Omit<Category, 'id'>>
export type NewSettlement = Omit<Settlement, 'id'>
export type NewSaving = Omit<Saving, 'id'>
export type NewSubscription = Omit<Subscription, 'id' | 'createdAt'>
export type SubscriptionUpdate = Partial<
  Omit<Subscription, 'id' | 'createdAt' | 'owner'>
>
