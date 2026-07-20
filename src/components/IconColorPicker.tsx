import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Check, MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { CategoryIcon, ICON_NAMES, searchIcons } from '@/lib/icons'
import { CATEGORY_SWATCHES } from '@/lib/palette'
import { cn } from '@/lib/utils'

// Cap how many icons render at once so a broad search (e.g. a single letter)
// doesn't mount hundreds of SVGs. Users narrow the query to find the rest.
const MAX_RESULTS = 120

// Nested full-screen sheet for choosing a Phosphor icon and a swatch color, used
// by the subscription form (and, later, the category editor). Both selections
// update live in the parent, so closing just dismisses. Opens from inside a
// modal, so it uses the base-ui dialog primitives directly for a full-screen popup.
export function IconColorPicker({
  open,
  onOpenChange,
  icon,
  colorTag,
  onIconChange,
  onColorChange,
  colorEditable = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  icon: string
  colorTag: string
  onIconChange: (icon: string) => void
  onColorChange: (color: string) => void
  // When false, the color is fixed (e.g. a subcategory inheriting its group's
  // color): the swatch grid is hidden and only the icon can be chosen.
  colorEditable?: boolean
}) {
  const [searchOpen, setSearchOpen] = useState(false)

  // The featured quick-pick set. If the current icon is a custom one (picked
  // from the full library, so not in the curated list), pin it to the front so
  // it stays visible and selected here.
  const featuredNames = useMemo(
    () =>
      icon && !ICON_NAMES.includes(icon) ? [icon, ...ICON_NAMES] : ICON_NAMES,
    [icon],
  )

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 mx-auto flex h-svh w-full max-w-md flex-col bg-background outline-none data-open:animate-in data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:slide-out-to-bottom-4">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <DialogPrimitive.Close
              className="text-muted-foreground"
              aria-label="Done"
            >
              <X size={24} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="font-heading text-lg font-semibold">
              {colorEditable ? 'Icon and color' : 'Icon'}
            </DialogPrimitive.Title>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {/* Live preview of the current combination. */}
            <div className="flex justify-center pb-2">
              <div
                className="flex size-16 items-center justify-center rounded-2xl text-neutral-800"
                style={{ backgroundColor: colorTag || 'var(--muted)' }}
              >
                <CategoryIcon name={icon} size={30} />
              </div>
            </div>

            {colorEditable && (
              <>
                <h3 className="pt-2 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Color
                </h3>
                <div className="flex flex-wrap gap-3">
                  {CATEGORY_SWATCHES.map((swatch) => {
                    const selected = swatch === colorTag
                    return (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => onColorChange(swatch)}
                        aria-label={`Color ${swatch}`}
                        className={cn(
                          'flex size-9 items-center justify-center rounded-full text-neutral-800 transition-transform active:scale-95',
                          selected &&
                            'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                        )}
                        style={{ backgroundColor: swatch }}
                      >
                        {selected && <Check size={16} weight="bold" />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <h3 className="pt-6 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Icon
            </h3>
            <div className="grid grid-cols-6 gap-2 pb-4">
              {featuredNames.map((name) => {
                const selected = name === icon
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onIconChange(name)}
                    aria-label={name}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-xl border transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-transparent bg-muted text-muted-foreground hover:bg-accent',
                    )}
                  >
                    <CategoryIcon name={name} size={22} />
                  </button>
                )
              })}
              {/* Last tile opens the full-library search. */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search all icons"
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus size={22} />
              </button>
            </div>
          </div>

          <div className="border-t border-border p-4">
            <DialogPrimitive.Close className="flex h-10 w-full items-center justify-center rounded-4xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">
              Done
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>

      <IconSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        selected={icon}
        onSelect={(name) => {
          onIconChange(name)
          setSearchOpen(false)
        }}
      />
    </DialogPrimitive.Root>
  )
}

// Full-library icon search, opened from the "+" tile. Type to filter every
// Phosphor icon; picking one selects it and closes. Only real icon names are
// ever selectable, so the "Phosphor only" constraint holds by construction.
function IconSearchDialog({
  open,
  onOpenChange,
  selected,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: string
  onSelect: (name: string) => void
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchIcons(query), [query])

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery('')
    onOpenChange(next)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 mx-auto flex h-svh w-full max-w-md flex-col bg-background outline-none data-open:animate-in data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:slide-out-to-bottom-4">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <DialogPrimitive.Close
              className="text-muted-foreground"
              aria-label="Back"
            >
              <X size={24} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="font-heading text-lg font-semibold">
              Choose an icon
            </DialogPrimitive.Title>
          </header>

          <div className="border-b border-border p-4">
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all icons"
                autoFocus
                // text-base (16px) on mobile stops iOS Safari zooming on focus.
                className="h-10 w-full rounded-xl border border-border bg-muted pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus:border-primary md:text-sm"
              />
              {query.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No icons match "{query.trim()}"
              </p>
            ) : (
              <>
                <div className="grid grid-cols-6 gap-2 pb-2">
                  {results.slice(0, MAX_RESULTS).map((name) => {
                    const isSelected = name === selected
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => onSelect(name)}
                        aria-label={name}
                        className={cn(
                          'flex aspect-square items-center justify-center rounded-xl border transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-transparent bg-muted text-muted-foreground hover:bg-accent',
                        )}
                      >
                        <CategoryIcon name={name} size={22} />
                      </button>
                    )
                  })}
                </div>
                {results.length > MAX_RESULTS && (
                  <p className="pb-4 text-center text-xs text-muted-foreground">
                    Showing {MAX_RESULTS} of {results.length}. Keep typing to
                    narrow it down.
                  </p>
                )}
              </>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
