import { Receipt, type Icon } from '@phosphor-icons/react'
import * as PhosphorIcons from '@phosphor-icons/react'

// Curated set shown first in the icon picker: the icons used by the default
// categories, plus a handful of common extras. These are the "featured" quick
// picks. The full Phosphor library is still available via the search grid
// (see ALL_ICON_NAMES) so a category/subscription can use any Phosphor icon.
export const ICON_NAMES = [
  'Airplane',
  'Armchair',
  'Barbell',
  'Bone',
  'BowlFood',
  'Broom',
  'Buildings',
  'Car',
  'Circle',
  'Cloud',
  'Coffee',
  'CreditCard',
  'DeviceMobile',
  'DotsThreeOutline',
  'Drop',
  'FilmSlate',
  'FirstAid',
  'Folder',
  'ForkKnife',
  'GameController',
  'GasPump',
  'Gift',
  'GraduationCap',
  'Handshake',
  'Heart',
  'House',
  'Island',
  'Lightning',
  'MonitorPlay',
  'MusicNotes',
  'Newspaper',
  'PaintBrush',
  'PawPrint',
  'Receipt',
  'ShieldCheck',
  'ShoppingCart',
  'Sparkle',
  'Stethoscope',
  'Taxi',
  'Television',
  'Ticket',
  'Train',
  'TShirt',
  'WifiHigh',
  'Wine',
  'Wrench',
]

const registry = PhosphorIcons as unknown as Record<string, Icon | undefined>

// A bare export is a real icon only if its canonical `${name}Icon` sibling also
// exists. This filters out the non-icon exports (IconBase, IconContext, SSR).
function isIconName(name: string): boolean {
  return /^[A-Z]/.test(name) && !name.endsWith('Icon') && `${name}Icon` in registry
}

/**
 * Every Phosphor icon name (bare form, e.g. "ShoppingCart"), sorted. Backs the
 * searchable "add custom icon" grid. Built from the library's own exports, so
 * only real Phosphor icons can ever be selected.
 */
export const ALL_ICON_NAMES = Object.keys(registry).filter(isIconName).sort()

/** Split a PascalCase icon name into lowercase words for search matching. */
function words(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
}

const searchIndex = ALL_ICON_NAMES.map((name) => ({ name, haystack: words(name) }))

/** Filter the full icon set by a free-text query (matched against icon names). */
export function searchIcons(query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return ALL_ICON_NAMES
  const tokens = q.split(/\s+/)
  return searchIndex
    .filter(({ haystack }) => tokens.every((t) => haystack.includes(t)))
    .map(({ name }) => name)
}

export function getCategoryIcon(name: string | undefined): Icon {
  if (name && isIconName(name)) return registry[name] as Icon
  return Receipt
}

export function CategoryIcon({
  name,
  size = 22,
  weight = 'regular',
}: {
  name: string | undefined
  size?: number
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
}) {
  const Component = getCategoryIcon(name)
  return <Component size={size} weight={weight} />
}
