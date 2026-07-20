import { DEFAULT_CATEGORIES } from '@/lib/defaultCategories'
import type { Category, Expense } from '@/lib/types'

// Pure helpers for turning the flat `categories` collection into the shapes the
// UI needs: a parent-with-children tree, human labels, colors, the seeded
// default, and the most-recently-used shortlist.

export interface CategoryGroup {
  parent: Category
  children: Category[]
}

// Canonical positions from the seed, used as a fallback sort key for categories
// that predate the `order` field (or were never reordered). Real `order` values
// always win; this just keeps the seeded tree in its familiar shape meanwhile.
const GROUP_ORDER = new Map(DEFAULT_CATEGORIES.map((g, i) => [g.name, i]))
const CHILD_ORDER = new Map<string, number>()
DEFAULT_CATEGORIES.forEach((g) =>
  g.children.forEach((c, i) => CHILD_ORDER.set(`${g.name}/${c.name}`, i)),
)

const FALLBACK = 10_000

function groupSortKey(c: Category): number {
  return typeof c.order === 'number' ? c.order : GROUP_ORDER.get(c.name) ?? FALLBACK
}

function childSortKey(c: Category, parentName: string): number {
  if (typeof c.order === 'number') return c.order
  return CHILD_ORDER.get(`${parentName}/${c.name}`) ?? FALLBACK
}

/**
 * Groups categories into top-level parents each holding their subcategories.
 * Parents are ordered by their `order` (drag-reorderable); children keep their
 * own order. Ties fall back to the seed's canonical order, then name.
 */
export function buildCategoryTree(categories: Category[]): CategoryGroup[] {
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name)
  const parents = categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => groupSortKey(a) - groupSortKey(b) || byName(a, b))

  return parents.map((parent) => ({
    parent,
    children: categories
      .filter((c) => c.parentId === parent.id)
      .sort(
        (a, b) =>
          childSortKey(a, parent.name) - childSortKey(b, parent.name) ||
          byName(a, b),
      ),
  }))
}

/**
 * The color to show for a category: a group owns its color; a subcategory
 * inherits its parent group's color (falling back to its own if the parent is
 * missing). This is the single source of truth for category colors in the UI.
 */
export function resolveCategoryColor(
  byId: Map<string, Category>,
  category: Category | undefined,
): string | undefined {
  if (!category) return undefined
  if (!category.parentId) return category.colorTag
  return byId.get(category.parentId)?.colorTag ?? category.colorTag
}

/** "Parent / Child" for a subcategory, or just the name for a top-level one. */
export function categoryLabel(
  byId: Map<string, Category>,
  category: Category,
): string {
  if (!category.parentId) return category.name
  const parent = byId.get(category.parentId)
  return parent ? `${parent.name} / ${category.name}` : category.name
}

/**
 * The category new expenses start on: the seeded Uncategorized > General leaf,
 * falling back to the first subcategory, then the first category, else null.
 */
export function defaultCategoryId(categories: Category[]): string | null {
  const general = categories.find(
    (c) => c.parentId !== null && c.name === 'General',
  )
  if (general) return general.id
  const firstLeaf = categories.find((c) => c.parentId !== null)
  return firstLeaf?.id ?? categories[0]?.id ?? null
}

/**
 * The last `limit` distinct categories used across all expenses, most recent
 * first. Expenses arrive date-desc from the ledger, so first-seen order here is
 * "most recently used". Categories that no longer exist are dropped.
 */
export function recentCategoryIds(
  expenses: Expense[],
  byId: Map<string, Category>,
  limit = 5,
): string[] {
  const seen: string[] = []
  for (const e of expenses) {
    if (!byId.has(e.categoryId)) continue
    if (seen.includes(e.categoryId)) continue
    seen.push(e.categoryId)
    if (seen.length === limit) break
  }
  return seen
}
