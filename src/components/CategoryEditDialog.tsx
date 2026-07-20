import { useEffect, useState } from 'react'
import { CaretRight, CircleNotch, Trash } from '@phosphor-icons/react'
import {
  addCategory,
  deleteBudget,
  deleteCategory,
  setBudget,
  updateCategory,
} from '@/lib/firestore'
import { parseAmount } from '@/lib/format'
import { CategoryIcon } from '@/lib/icons'
import { CATEGORY_SWATCHES, randomSwatch } from '@/lib/palette'
import { IconColorPicker } from '@/components/IconColorPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Budget, Category } from '@/lib/types'

// Add / edit a category. A "group" (top-level) owns a color and an optional
// monthly budget; a "subcategory" inherits its group's color and only picks an
// icon. Both create and edit run through here; the writes live in firestore.ts.
export function CategoryEditDialog({
  open,
  onOpenChange,
  mode,
  category,
  group,
  nextOrder,
  existingBudget,
  deletable,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'group' | 'subcategory'
  category: Category | null // null = adding
  group: Category | null // the parent group (subcategory mode)
  nextOrder: number // order to assign when adding
  existingBudget: Budget | null // current standing budget for this group
  deletable: boolean
}) {
  const isEdit = Boolean(category)
  const isGroup = mode === 'group'

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Folder')
  const [color, setColor] = useState<string>(CATEGORY_SWATCHES[0])
  const [budgetStr, setBudgetStr] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // (Re)initialize each time the dialog opens.
  useEffect(() => {
    if (!open) return
    if (category) {
      setName(category.name)
      setIcon(category.icon)
      setColor(isGroup ? category.colorTag : group?.colorTag ?? category.colorTag)
      setBudgetStr(
        existingBudget ? String(existingBudget.amount).replace('.', ',') : '',
      )
    } else {
      setName('')
      setIcon(isGroup ? 'Folder' : 'Circle')
      setColor(isGroup ? randomSwatch() : group?.colorTag ?? CATEGORY_SWATCHES[0])
      setBudgetStr('')
    }
    setConfirmingDelete(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const trimmed = name.trim()
    if (trimmed === '') {
      setError('Give it a name')
      return
    }

    let budgetAmount: number | null = null
    if (isGroup && budgetStr.trim() !== '') {
      const parsed = parseAmount(budgetStr)
      if (parsed === null) {
        setError("That budget doesn't look like a number")
        return
      }
      if (parsed < 0) {
        setError("A budget can't be negative")
        return
      }
      budgetAmount = Math.round(parsed * 100) / 100
    }

    // Subcategories store their group's color so the data stays consistent with
    // what resolveCategoryColor shows.
    const colorTag = isGroup ? color : group?.colorTag ?? color

    setSaving(true)
    setError(null)
    try {
      let categoryId = category?.id
      if (category) {
        await updateCategory(category.id, { name: trimmed, icon, colorTag })
      } else {
        categoryId = await addCategory({
          name: trimmed,
          icon,
          colorTag,
          parentId: isGroup ? null : group?.id ?? null,
          order: nextOrder,
        })
      }

      if (isGroup && categoryId) {
        if (budgetAmount && budgetAmount > 0) {
          await setBudget(categoryId, budgetAmount)
        } else if (existingBudget) {
          await deleteBudget(existingBudget.id)
        }
      }
      onOpenChange(false)
    } catch {
      setError("Couldn't save that. Try again?")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!category) return
    setDeleting(true)
    try {
      await deleteCategory(category.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that")
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  const title = `${isEdit ? 'Edit' : 'Add'} ${isGroup ? 'group' : 'subcategory'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isGroup ? 'Groceries, Travel...' : 'Subcategory name'}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{isGroup ? 'Icon and color' : 'Icon'}</Label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-3 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-left transition-colors hover:bg-input"
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-800"
                style={{ backgroundColor: color || 'var(--muted)' }}
              >
                <CategoryIcon name={icon} size={18} />
              </div>
              <span className="flex-1 text-muted-foreground">
                {isGroup ? 'Pick an icon and color' : 'Pick an icon'}
              </span>
              <CaretRight size={18} className="text-muted-foreground" />
            </button>
            {!isGroup && (
              <p className="px-1 text-xs text-muted-foreground">
                Subcategories use their group's color.
              </p>
            )}
          </div>

          {isGroup && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-budget">Monthly budget (optional)</Label>
              <div className="flex items-center gap-2 rounded-3xl border border-transparent bg-input/50 px-3 py-1">
                <span className="text-muted-foreground">€</span>
                <input
                  id="cat-budget"
                  type="text"
                  inputMode="decimal"
                  value={budgetStr}
                  onChange={(e) => setBudgetStr(e.target.value)}
                  placeholder="0,00"
                  className="h-8 flex-1 bg-transparent text-base tabular-nums outline-none placeholder:text-muted-foreground/50 md:text-sm"
                />
              </div>
              <p className="px-1 text-xs text-muted-foreground">
                Leave empty for no budget. Applies every month, tracked on Stats.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-3 pt-1">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? (
                <CircleNotch size={18} className="animate-spin" />
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Add'
              )}
            </Button>

            {isEdit &&
              deletable &&
              (confirmingDelete ? (
                <div className="flex flex-col gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-center text-sm text-muted-foreground">
                    {isGroup
                      ? 'Delete this group and its subcategories? Any expenses on them move to Uncategorized.'
                      : 'Delete this subcategory? Any expenses on it move to Uncategorized.'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                    >
                      Keep it
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="lg"
                      className="flex-1"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <CircleNotch size={18} className="animate-spin" />
                      ) : (
                        'Delete'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash size={18} />
                  Delete {isGroup ? 'group' : 'subcategory'}
                </Button>
              ))}
          </div>
        </form>

        <IconColorPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          icon={icon}
          colorTag={color}
          onIconChange={setIcon}
          onColorChange={setColor}
          colorEditable={isGroup}
        />
      </DialogContent>
    </Dialog>
  )
}
