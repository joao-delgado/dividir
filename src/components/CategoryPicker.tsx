import { useMemo } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X, Check } from '@phosphor-icons/react'
import { CategoryIcon } from '@/lib/icons'
import {
  buildCategoryTree,
  categoryLabel,
  resolveCategoryColor,
} from '@/lib/categoryTree'
import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types'

// Full-screen sheet for picking a category. Shows a "Recent" shortcut group at
// the top, then the full parent / subcategory tree. Selecting a row picks it and
// closes. It's a nested dialog (it opens from inside the Add Expense modal), so
// it uses the base-ui dialog primitives directly for a full-screen popup.
export function CategoryPicker({
  open,
  onOpenChange,
  categories,
  byId,
  selectedId,
  recentIds,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  byId: Map<string, Category>
  selectedId: string | null
  recentIds: string[]
  onSelect: (id: string) => void
}) {
  const tree = useMemo(() => buildCategoryTree(categories), [categories])
  const recent = recentIds
    .map((id) => byId.get(id))
    .filter((c): c is Category => Boolean(c))

  function pick(id: string) {
    onSelect(id)
    onOpenChange(false)
  }

  function Row({ category, label }: { category: Category; label: string }) {
    const selected = category.id === selectedId
    return (
      <button
        type="button"
        onClick={() => pick(category.id)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-800"
          style={{
            backgroundColor:
              resolveCategoryColor(byId, category) || 'var(--muted)',
          }}
        >
          <CategoryIcon name={category.icon} size={18} />
        </div>
        <span className={cn('flex-1 truncate', selected && 'font-medium')}>
          {label}
        </span>
        {selected && <Check size={18} weight="bold" className="text-primary" />}
      </button>
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 mx-auto flex h-svh w-full max-w-md flex-col bg-background outline-none data-open:animate-in data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:slide-out-to-bottom-4">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <DialogPrimitive.Close
              className="text-muted-foreground"
              aria-label="Close"
            >
              <X size={24} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="font-heading text-lg font-semibold">
              Category
            </DialogPrimitive.Title>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto pb-8">
            {recent.length > 0 && (
              <section>
                <h3 className="px-4 pt-4 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Recent
                </h3>
                {recent.map((c) => (
                  <Row
                    key={`recent-${c.id}`}
                    category={c}
                    label={categoryLabel(byId, c)}
                  />
                ))}
              </section>
            )}

            {tree.map(({ parent, children }) => (
              <section key={parent.id}>
                <h3 className="px-4 pt-4 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {parent.name}
                </h3>
                {children.length > 0 ? (
                  children.map((child) => (
                    <Row key={child.id} category={child} label={child.name} />
                  ))
                ) : (
                  <Row category={parent} label={parent.name} />
                )}
              </section>
            ))}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
