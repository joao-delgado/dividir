import { doc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { collections } from '@/lib/firestore'
import { DEFAULT_CATEGORIES } from '@/lib/defaultCategories'
import { randomSwatch } from '@/lib/palette'

export interface SeedUser {
  uid: string
  name: string
  colorTag: string
}

/** True if the categories collection already has documents. */
export async function isSeeded(): Promise<boolean> {
  const snapshot = await getDocs(collections.categories)
  return !snapshot.empty
}

/**
 * Writes the two user profiles and the default category tree in a single batch.
 * User docs use the given Firebase Auth UIDs as their doc IDs (safe to re-run),
 * but categories use auto IDs, so re-seeding would duplicate them. Guarded by
 * isSeeded() unless force is passed.
 */
export async function seedDatabase(
  users: [SeedUser, SeedUser],
  force = false,
): Promise<{ users: number; categories: number }> {
  if (!force && (await isSeeded())) {
    throw new Error(
      'Categories already exist. Seeding again would duplicate them. Pass force to reseed.',
    )
  }

  const batch = writeBatch(db)

  for (const user of users) {
    batch.set(doc(db, 'users', user.uid), {
      name: user.name,
      colorTag: user.colorTag,
      avatarBase64: null,
    })
  }

  let categoryCount = 0
  DEFAULT_CATEGORIES.forEach((top, groupIndex) => {
    // One color per group; subcategories inherit it (see resolveCategoryColor).
    const groupColor = randomSwatch()
    const parentRef = doc(collections.categories)
    batch.set(parentRef, {
      name: top.name,
      icon: top.icon,
      colorTag: groupColor,
      parentId: null,
      order: groupIndex,
    })
    categoryCount++

    top.children.forEach((child, childIndex) => {
      batch.set(doc(collections.categories), {
        name: child.name,
        icon: child.icon,
        colorTag: groupColor,
        parentId: parentRef.id,
        order: childIndex,
      })
      categoryCount++
    })
  })

  await batch.commit()
  return { users: users.length, categories: categoryCount }
}
