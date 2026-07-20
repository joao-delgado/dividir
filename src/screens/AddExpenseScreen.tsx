import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CaretRight, CircleNotch, Trash } from '@phosphor-icons/react'
import { useUsers } from '@/lib/users'
import { useCategories } from '@/lib/categories'
import { useLedger } from '@/lib/ledger'
import { addExpense, deleteExpense, updateExpense } from '@/lib/firestore'
import {
  categoryLabel,
  defaultCategoryId,
  recentCategoryIds,
  resolveCategoryColor,
} from '@/lib/categoryTree'
import { parseAmount, todayStr } from '@/lib/format'
import { CategoryIcon } from '@/lib/icons'
import { CategoryPicker } from '@/components/CategoryPicker'
import { DatePicker } from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SplitType } from '@/lib/types'

// The four "who paid + split" choices, as (payer, split) pairs. Labels are built
// dynamically from the partner's name (see below).
type Payer = 'me' | 'partner'
type PayKey = `${Payer}-${SplitType}`

export default function AddExpenseScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)

  const { me, partner } = useUsers()
  const { categories, byId, loading: categoriesLoading } = useCategories()
  const { expenses, loading: ledgerLoading } = useLedger()

  const editing = useMemo(
    () => (id ? expenses.find((e) => e.id === id) ?? null : null),
    [expenses, id],
  )

  // Form state.
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [payKey, setPayKey] = useState<PayKey>('me-equal')
  const [date, setDate] = useState(todayStr())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Guards the one-time hydration so later edits aren't clobbered by re-renders.
  const [hydrated, setHydrated] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  // Closing the modal: step back to whatever was underneath. On a direct load
  // (no history) go Home instead so "back" doesn't leave the app.
  function close() {
    if (location.key === 'default') navigate('/', { replace: true })
    else navigate(-1)
  }

  // Default the category once categories load (add mode only).
  useEffect(() => {
    if (isEdit || categoryId || categories.length === 0) return
    setCategoryId(defaultCategoryId(categories))
  }, [isEdit, categoryId, categories])

  // Hydrate the form from the expense being edited, once it's loaded.
  useEffect(() => {
    if (!isEdit || hydrated || !editing || !me) return
    setAmount(String(editing.amount).replace('.', ','))
    setDescription(editing.description)
    setCategoryId(editing.categoryId)
    setDate(editing.date)
    const payer: Payer = editing.paidBy === me.id ? 'me' : 'partner'
    setPayKey(`${payer}-${editing.splitType}`)
    setHydrated(true)
  }, [isEdit, hydrated, editing, me])

  const partnerName = partner?.name ?? 'Partner'
  const payOptions: { key: PayKey; label: string }[] = [
    { key: 'me-equal', label: 'You paid, split equally' },
    { key: 'me-solo', label: 'You are owed the full amount' },
    { key: 'partner-equal', label: `${partnerName} paid, split equally` },
    { key: 'partner-solo', label: `${partnerName} is owed the full amount` },
  ]

  const selectedCategory = categoryId ? byId.get(categoryId) : undefined
  const recentIds = useMemo(
    () => recentCategoryIds(expenses, byId),
    [expenses, byId],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const parsedAmount = parseAmount(amount)
    if (parsedAmount === null) {
      setError("That doesn't look like a number")
      return
    }
    if (parsedAmount <= 0) {
      setError('The amount has to be more than zero')
      return
    }
    if (description.trim() === '') {
      setError('What was it for?')
      return
    }
    if (!categoryId) {
      setError('Pick a category first')
      return
    }
    if (!me || !partner) {
      setError('Still loading, give it a second')
      return
    }

    const [payer, split] = payKey.split('-') as [Payer, SplitType]
    const fields = {
      // Normalize to cents so no float noise (e.g. 10.010000001) is stored.
      amount: Math.round(parsedAmount * 100) / 100,
      description: description.trim(),
      categoryId,
      paidBy: payer === 'me' ? me.id : partner.id,
      splitType: split,
      date,
    }

    setSaving(true)
    setError(null)
    try {
      if (isEdit && id) {
        await updateExpense(id, fields)
      } else {
        await addExpense(fields)
      }
      close()
    } catch {
      setError("Couldn't save that. Try again?")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    setDeleting(true)
    try {
      await deleteExpense(id)
      close()
    } catch {
      setError("Couldn't delete that. Try again?")
      setDeleting(false)
    }
  }

  const notFound = isEdit && !ledgerLoading && !editing
  const loadingExpense = isEdit && !editing && !notFound

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent
        className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto"
        initialFocus={amountRef}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEdit ? 'Edit expense' : 'Add expense'}
          </DialogTitle>
        </DialogHeader>

        {loadingExpense ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <CircleNotch size={24} className="animate-spin" />
          </div>
        ) : notFound ? (
          <p className="py-4 text-muted-foreground">
            That expense is gone. It may have been deleted or settled up.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Amount */}
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-muted-foreground">
                  €
                </span>
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  aria-label="Amount"
                  className="w-40 bg-transparent text-center text-4xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was it for?"
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-3 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-left transition-colors hover:bg-input"
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-800"
                  style={{
                    backgroundColor:
                      resolveCategoryColor(byId, selectedCategory) ||
                      'var(--muted)',
                  }}
                >
                  <CategoryIcon name={selectedCategory?.icon} size={18} />
                </div>
                <span className="flex-1 truncate">
                  {selectedCategory
                    ? categoryLabel(byId, selectedCategory)
                    : categoriesLoading
                      ? 'Loading...'
                      : 'Pick a category'}
                </span>
                <CaretRight size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Who paid + split */}
            <div className="flex flex-col gap-1.5">
              <Label>Who paid</Label>
              <Select
                value={payKey}
                onValueChange={(next) => setPayKey(next as PayKey)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: PayKey) =>
                      payOptions.find((o) => o.key === value)?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {payOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <DatePicker id="date" value={date} onChange={setDate} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-col gap-3 pt-1">
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? (
                  <CircleNotch size={18} className="animate-spin" />
                ) : isEdit ? (
                  'Save changes'
                ) : (
                  'Add expense'
                )}
              </Button>

              {isEdit &&
                (confirmingDelete ? (
                  <div className="flex flex-col gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-center text-sm text-muted-foreground">
                      Delete this expense? There's no undo.
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
                    Delete expense
                  </Button>
                ))}
            </div>
          </form>
        )}

        <CategoryPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          categories={categories}
          byId={byId}
          selectedId={categoryId}
          recentIds={recentIds}
          onSelect={setCategoryId}
        />
      </DialogContent>
    </Dialog>
  )
}
