import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CircleNotch,
  DotsSixVertical,
  Pencil,
  Plus,
} from '@phosphor-icons/react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useCategories } from '@/lib/categories'
import { reorderCategories, subscribeBudgets } from '@/lib/firestore'
import { buildCategoryTree, type CategoryGroup } from '@/lib/categoryTree'
import { formatCurrency } from '@/lib/format'
import { CategoryIcon } from '@/lib/icons'
import { CategoryEditDialog } from '@/components/CategoryEditDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Budget, Category } from '@/lib/types'

// What the edit dialog is currently doing, if anything.
type DialogState =
  | { mode: 'group'; category: Category | null; nextOrder: number }
  | {
      mode: 'subcategory'
      category: Category | null
      group: Category
      nextOrder: number
    }
  | null

export default function SettingsScreen() {
  const navigate = useNavigate()
  const { categories, loading } = useCategories()

  const [budgets, setBudgets] = useState<Budget[]>([])
  useEffect(() => subscribeBudgets(setBudgets), [])

  const budgetByGroup = useMemo(
    () => new Map(budgets.map((b) => [b.categoryId, b])),
    [budgets],
  )

  const tree = useMemo(() => buildCategoryTree(categories), [categories])
  const groupById = useMemo(
    () => new Map(tree.map((g) => [g.parent.id, g])),
    [tree],
  )
  const treeIds = useMemo(() => tree.map((g) => g.parent.id), [tree])

  // Local order for optimistic drag; resynced whenever the underlying set/order
  // changes (a save, a delete, or the other user reordering).
  const [orderIds, setOrderIds] = useState<string[]>(treeIds)
  useEffect(() => setOrderIds(treeIds), [treeIds])

  // One-time self-heal: older categories predate the `order` field. Give the
  // groups a real order (canonical/seed order) so drag has a stable baseline.
  const healed = useRef(false)
  useEffect(() => {
    if (loading || healed.current) return
    const groups = categories.filter((c) => c.parentId === null)
    if (groups.length === 0) return
    if (groups.every((g) => typeof g.order === 'number')) return
    healed.current = true
    reorderCategories(tree.map((g) => g.parent.id)).catch(() => {
      healed.current = false
    })
  }, [categories, loading, tree])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderIds.indexOf(String(active.id))
    const newIndex = orderIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(orderIds, oldIndex, newIndex)
    setOrderIds(next)
    reorderCategories(next).catch(() => setOrderIds(orderIds))
  }

  const [dialog, setDialog] = useState<DialogState>(null)

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky -top-px z-10">
        <header className="flex items-center gap-3 bg-muted px-4 pt-[calc(var(--spacing)*4+1px)] pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-heading text-2xl font-semibold">Categories</h1>
        </header>
        <div className="h-4 bg-linear-to-b from-muted to-muted/0" />
      </div>

      <div className="px-4 pb-24">
        <div className="flex items-center justify-between pt-2 pb-1">
          <p className="text-sm text-muted-foreground">
            Drag the handles to reorder groups and categories.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDialog({ mode: 'group', category: null, nextOrder: tree.length })
            }
          >
            <Plus weight="bold" /> Group
          </Button>
        </div>

        {loading && categories.length === 0 ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <CircleNotch size={24} className="animate-spin" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3 pt-2">
                {orderIds.map((id) => {
                  const group = groupById.get(id)
                  if (!group) return null
                  return (
                    <SortableGroupCard
                      key={id}
                      group={group}
                      budget={budgetByGroup.get(id) ?? null}
                      onEditGroup={() =>
                        setDialog({
                          mode: 'group',
                          category: group.parent,
                          nextOrder: 0,
                        })
                      }
                      onAddSub={() =>
                        setDialog({
                          mode: 'subcategory',
                          category: null,
                          group: group.parent,
                          nextOrder: group.children.length,
                        })
                      }
                      onEditSub={(child) =>
                        setDialog({
                          mode: 'subcategory',
                          category: child,
                          group: group.parent,
                          nextOrder: 0,
                        })
                      }
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {dialog && (
        <CategoryEditDialog
          open
          onOpenChange={(next) => {
            if (!next) setDialog(null)
          }}
          mode={dialog.mode}
          category={dialog.category}
          group={dialog.mode === 'subcategory' ? dialog.group : null}
          nextOrder={dialog.nextOrder}
          existingBudget={
            dialog.mode === 'group' && dialog.category
              ? budgetByGroup.get(dialog.category.id) ?? null
              : null
          }
          deletable={isDeletable(dialog)}
        />
      )}
    </div>
  )
}

/** The Uncategorized group and its General fallback can't be removed. */
function isDeletable(dialog: NonNullable<DialogState>): boolean {
  if (!dialog.category) return true
  if (dialog.mode === 'group') return dialog.category.name !== 'Uncategorized'
  return !(
    dialog.category.name === 'General' && dialog.group.name === 'Uncategorized'
  )
}

function SortableGroupCard({
  group,
  budget,
  onEditGroup,
  onAddSub,
  onEditSub,
}: {
  group: CategoryGroup
  budget: Budget | null
  onEditGroup: () => void
  onAddSub: () => void
  onEditSub: (child: Category) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.parent.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const color = group.parent.colorTag

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Local order for optimistic child drag; resynced whenever the underlying
  // set/order changes (a save, a delete, or the other user reordering).
  const childIds = useMemo(
    () => group.children.map((c) => c.id),
    [group.children],
  )
  const childById = useMemo(
    () => new Map(group.children.map((c) => [c.id, c])),
    [group.children],
  )
  const [childOrder, setChildOrder] = useState<string[]>(childIds)
  useEffect(() => setChildOrder(childIds), [childIds])

  function handleChildDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = childOrder.indexOf(String(active.id))
    const newIndex = childOrder.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(childOrder, oldIndex, newIndex)
    setChildOrder(next)
    reorderCategories(next).catch(() => setChildOrder(childOrder))
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'overflow-hidden rounded-2xl bg-card ring-1 ring-border',
        isDragging && 'relative z-10 opacity-80 shadow-lg',
      )}
    >
      {/* Group header */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="touch-none text-muted-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <DotsSixVertical size={22} />
        </button>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-neutral-800"
          style={{ backgroundColor: color }}
        >
          <CategoryIcon name={group.parent.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{group.parent.name}</p>
          {budget && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(budget.amount)} /mo budget
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onEditGroup}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Edit ${group.parent.name}`}
        >
          <Pencil size={18} />
        </button>
      </div>

      {/* Subcategories */}
      <div className="border-t border-border">
       <div className="divide-y divide-border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleChildDragEnd}
        >
          <SortableContext
            items={childOrder}
            strategy={verticalListSortingStrategy}
          >
            {childOrder.map((id) => {
              const child = childById.get(id)
              if (!child) return null
              return (
                <SortableSubItem
                  key={id}
                  child={child}
                  color={color}
                  onEdit={() => onEditSub(child)}
                />
              )
            })}
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={onAddSub}
          className="flex w-full items-center gap-2 py-2.5 pr-3 pl-5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus size={15} weight="bold" />
          Add subcategory
        </button>
       </div>
      </div>
    </div>
  )
}

function SortableSubItem({
  child,
  color,
  onEdit,
}: {
  child: Category
  color: string
  onEdit: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: child.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center bg-card transition-colors hover:bg-muted',
        isDragging && 'relative z-10 opacity-80 shadow-lg',
      )}
    >
      <button
        type="button"
        className="flex touch-none items-center py-2.5 pr-1 pl-3 text-muted-foreground"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical size={18} />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-1 items-center gap-3 py-2.5 pr-3 pl-1 text-left"
      >
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-800"
          style={{ backgroundColor: color }}
        >
          <CategoryIcon name={child.icon} size={15} />
        </div>
        <span className="flex-1 truncate text-sm">{child.name}</span>
        <Pencil size={15} className="text-muted-foreground" />
      </button>
    </div>
  )
}
