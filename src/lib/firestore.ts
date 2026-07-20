import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { monthYearKey, todayStr } from '@/lib/format'
import type {
  Budget,
  Category,
  CategoryUpdate,
  Expense,
  NewCategory,
  NewExpense,
  NewSettlement,
  NewSubscription,
  ExpenseUpdate,
  Saving,
  Settlement,
  Subscription,
  SubscriptionUpdate,
  UserProfile,
} from '@/lib/types'

/**
 * Single data-access layer for all Firestore reads and writes. Components call
 * these functions rather than touching Firestore directly, so every query lives
 * in one place (see CLAUDE.md > Conventions).
 */

// Collection references. Names match the data model.
export const collections = {
  users: collection(db, 'users'),
  categories: collection(db, 'categories'),
  budgets: collection(db, 'budgets'),
  expenses: collection(db, 'expenses'),
  settlements: collection(db, 'settlements'),
  subscriptions: collection(db, 'subscriptions'),
  savings: collection(db, 'savings'),
}

// --- users ------------------------------------------------------------------

/** Real-time listener for both user profiles (João and Inês). */
export function subscribeUsers(
  onChange: (users: UserProfile[]) => void,
): Unsubscribe {
  return onSnapshot(collections.users, (snapshot) => {
    onChange(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserProfile, 'id'>),
      })),
    )
  })
}

/**
 * Sets (or clears, with null) the signed-in user's avatar. The image is already
 * resized/compressed to a small base64 JPEG client-side (see lib/image.ts) so it
 * stays well under Firestore's 1MB per-doc limit.
 */
export async function updateUserAvatar(
  userId: string,
  avatarBase64: string | null,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { avatarBase64 })
}

/** Sets the user's accent color (one of the fixed palette swatches). */
export async function updateUserColor(
  userId: string,
  colorTag: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { colorTag })
}

// --- categories -------------------------------------------------------------

/** Real-time listener for the category tree. */
export function subscribeCategories(
  onChange: (categories: Category[]) => void,
): Unsubscribe {
  return onSnapshot(collections.categories, (snapshot) => {
    onChange(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Category, 'id'>),
      })),
    )
  })
}

export async function addCategory(data: NewCategory): Promise<string> {
  const ref = await addDoc(collections.categories, data)
  return ref.id
}

export async function updateCategory(
  id: string,
  data: CategoryUpdate,
): Promise<void> {
  await updateDoc(doc(db, 'categories', id), data)
}

/** Persists a new order for top-level groups (index = position). */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, 'categories', id), { order: index })
  })
  await batch.commit()
}

/**
 * Deletes a category and moves anything pointing at it to Uncategorized >
 * General, so no expense is ever left orphaned. Deleting a group also deletes
 * its subcategories (their expenses move to General too). The General fallback
 * and its Uncategorized parent can't be deleted. Budgets on the removed
 * categories are cleaned up as well.
 */
export async function deleteCategory(id: string): Promise<void> {
  const snapshot = await getDocs(collections.categories)
  const cats = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Category, 'id'>),
  }))

  const target = cats.find((c) => c.id === id)
  if (!target) return

  const general = cats.find((c) => c.parentId !== null && c.name === 'General')
  if (!general) {
    throw new Error('Cannot delete: the Uncategorized > General fallback is missing')
  }
  if (target.id === general.id) {
    throw new Error('The General category is the fallback and cannot be deleted')
  }
  if (target.parentId === null && target.name === 'Uncategorized') {
    throw new Error('The Uncategorized group is the fallback and cannot be deleted')
  }

  // The category itself, plus its children if it's a group.
  const removedIds =
    target.parentId === null
      ? [target.id, ...cats.filter((c) => c.parentId === target.id).map((c) => c.id)]
      : [target.id]

  const batch = writeBatch(db)

  // Reassign expenses off each removed category onto General.
  for (const removedId of removedIds) {
    const expenses = await getDocs(
      query(collections.expenses, where('categoryId', '==', removedId)),
    )
    expenses.forEach((e) => batch.update(e.ref, { categoryId: general.id }))

    const budgets = await getDocs(
      query(collections.budgets, where('categoryId', '==', removedId)),
    )
    budgets.forEach((b) => batch.delete(b.ref))

    batch.delete(doc(db, 'categories', removedId))
  }

  await batch.commit()
}

// --- budgets ----------------------------------------------------------------

/**
 * Real-time listener for the standing per-category budgets. A budget applies to
 * every month until it's changed, so there's at most one per category. If any
 * legacy per-month docs linger for a category, the latest month wins.
 */
export function subscribeBudgets(
  onChange: (budgets: Budget[]) => void,
): Unsubscribe {
  return onSnapshot(collections.budgets, (snapshot) => {
    const byCategory = new Map<string, Budget>()
    for (const d of snapshot.docs) {
      const b = { id: d.id, ...(d.data() as Omit<Budget, 'id'>) }
      const prev = byCategory.get(b.categoryId)
      if (!prev || (b.monthYear ?? '') > (prev.monthYear ?? '')) {
        byCategory.set(b.categoryId, b)
      }
    }
    onChange([...byCategory.values()])
  })
}

/**
 * Sets the standing monthly budget for a category. Upserts on categoryId so
 * there's at most one budget per category, applied to every month. `monthYear`
 * records when it was last set (used only to break ties against legacy docs).
 */
export async function setBudget(
  categoryId: string,
  amount: number,
): Promise<string> {
  const existing = await getDocs(
    query(collections.budgets, where('categoryId', '==', categoryId)),
  )
  const monthYear = monthYearKey(todayStr())
  if (!existing.empty) {
    const ref = existing.docs[0].ref
    await updateDoc(ref, { amount, monthYear })
    return ref.id
  }
  const ref = await addDoc(collections.budgets, { categoryId, monthYear, amount })
  return ref.id
}

export async function deleteBudget(id: string): Promise<void> {
  await deleteDoc(doc(db, 'budgets', id))
}

// --- expenses ---------------------------------------------------------------

/**
 * Real-time listener for expenses. Pass `sinceDate` ("YYYY-MM-DD") to get only
 * unsettled expenses for the Home screen; omit it for full history in Stats.
 */
export function subscribeExpenses(
  onChange: (expenses: Expense[]) => void,
  sinceDate?: string,
): Unsubscribe {
  // Date strings are "YYYY-MM-DD", so lexicographic order is chronological.
  const q = sinceDate
    ? query(
        collections.expenses,
        where('date', '>', sinceDate),
        orderBy('date', 'desc'),
      )
    : query(collections.expenses, orderBy('date', 'desc'))
  return onSnapshot(q, (snapshot) => {
    onChange(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Expense, 'id'>),
      })),
    )
  })
}

export async function addExpense(data: NewExpense): Promise<string> {
  const ref = await addDoc(collections.expenses, {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateExpense(
  id: string,
  data: ExpenseUpdate,
): Promise<void> {
  await updateDoc(doc(db, 'expenses', id), data)
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', id))
}

// --- settlements ------------------------------------------------------------

/** Real-time listener for settlement history. */
export function subscribeSettlements(
  onChange: (settlements: Settlement[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(collections.settlements, orderBy('date', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Settlement, 'id'>),
        })),
      )
    },
  )
}

export async function addSettlement(data: NewSettlement): Promise<string> {
  const ref = await addDoc(collections.settlements, data)
  return ref.id
}

/** Undoes the most recent settlement, restoring its expenses to the Home list. */
export async function deleteSettlement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'settlements', id))
}

// --- subscriptions ----------------------------------------------------------

/**
 * Real-time listener for all subscriptions. Solo-subscription visibility (only
 * the owner sees their own) is filtered client-side; see lib/subscriptions.ts.
 */
export function subscribeSubscriptions(
  onChange: (subscriptions: Subscription[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(collections.subscriptions, orderBy('name')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Subscription, 'id'>),
        })),
      )
    },
  )
}

export async function addSubscription(data: NewSubscription): Promise<string> {
  const ref = await addDoc(collections.subscriptions, {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateSubscription(
  id: string,
  data: SubscriptionUpdate,
): Promise<void> {
  await updateDoc(doc(db, 'subscriptions', id), data)
}

export async function deleteSubscription(id: string): Promise<void> {
  await deleteDoc(doc(db, 'subscriptions', id))
}

// --- savings ----------------------------------------------------------------

/**
 * Real-time listener for every savings entry (both people, all months). Volume
 * is tiny (a couple of docs per month), so we subscribe to the whole collection
 * and slice it client-side, same as the ledger.
 */
export function subscribeSavings(
  onChange: (savings: Saving[]) => void,
): Unsubscribe {
  return onSnapshot(collections.savings, (snapshot) => {
    onChange(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Saving, 'id'>),
      })),
    )
  })
}

/**
 * Records how much a user saved in a month. Upserts on the (userId, monthYear)
 * pair so there's at most one entry per person per month. The amount may be
 * negative (an overspent month).
 */
export async function setSaving(
  userId: string,
  monthYear: string,
  amount: number,
): Promise<string> {
  const existing = await getDocs(
    query(
      collections.savings,
      where('userId', '==', userId),
      where('monthYear', '==', monthYear),
    ),
  )
  if (!existing.empty) {
    const ref = existing.docs[0].ref
    await updateDoc(ref, { amount })
    return ref.id
  }
  const ref = await addDoc(collections.savings, { userId, monthYear, amount })
  return ref.id
}

export async function deleteSaving(id: string): Promise<void> {
  await deleteDoc(doc(db, 'savings', id))
}
