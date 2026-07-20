import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CaretRight, CircleNotch, Trash } from '@phosphor-icons/react'
import { useUsers } from '@/lib/users'
import {
  addSubscription,
  deleteSubscription,
  subscribeSubscriptions,
  updateSubscription,
} from '@/lib/firestore'
import { parseAmount } from '@/lib/format'
import { CategoryIcon } from '@/lib/icons'
import { CATEGORY_SWATCHES } from '@/lib/palette'
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
import { cn } from '@/lib/utils'
import type {
  Subscription,
  SubscriptionCycle,
  SplitType,
} from '@/lib/types'

const DEFAULT_ICON = 'MonitorPlay'
const DEFAULT_COLOR = CATEGORY_SWATCHES[0]

// A small two-option segmented control for the binary choices (cycle, split,
// active). Generic over the option value so it works for strings and booleans.
function Segmented<T extends string | boolean>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-3xl bg-muted p-1">
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-9 rounded-3xl text-sm font-medium transition-colors',
              selected
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function AddSubscriptionScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)

  const { me } = useUsers()

  // The subscription form is opened outside the Subscriptions list, so for edit
  // we run our own listener to find the record. Cheap at this volume.
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null)
  useEffect(() => {
    if (!isEdit) return
    return subscribeSubscriptions(setSubscriptions)
  }, [isEdit])

  const editing = useMemo(
    () => (id && subscriptions ? subscriptions.find((s) => s.id === id) ?? null : null),
    [subscriptions, id],
  )

  // Form state.
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<SubscriptionCycle>('monthly')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [icon, setIcon] = useState<string>(DEFAULT_ICON)
  const [colorTag, setColorTag] = useState<string>(DEFAULT_COLOR)
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  function close() {
    if (location.key === 'default') navigate('/subscriptions', { replace: true })
    else navigate(-1)
  }

  // Hydrate the form from the subscription being edited, once it's loaded.
  useEffect(() => {
    if (!isEdit || hydrated || !editing) return
    setName(editing.name)
    setAmount(String(editing.amount).replace('.', ','))
    setCycle(editing.cycle)
    setSplitType(editing.splitType)
    setIcon(editing.icon)
    setColorTag(editing.colorTag)
    setActive(editing.active)
    setHydrated(true)
  }, [isEdit, hydrated, editing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    if (name.trim() === '') {
      setError('Give it a name')
      return
    }
    const parsedAmount = parseAmount(amount)
    if (parsedAmount === null) {
      setError("That doesn't look like a number")
      return
    }
    if (parsedAmount <= 0) {
      setError('The amount has to be more than zero')
      return
    }
    if (!me) {
      setError('Still loading, give it a second')
      return
    }

    const fields = {
      name: name.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      cycle,
      splitType,
      icon,
      colorTag,
      active,
    }

    setSaving(true)
    setError(null)
    try {
      if (isEdit && id) {
        await updateSubscription(id, fields)
      } else {
        await addSubscription({ ...fields, owner: me.id })
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
      await deleteSubscription(id)
      close()
    } catch {
      setError("Couldn't delete that. Try again?")
      setDeleting(false)
    }
  }

  const notFound = isEdit && subscriptions !== null && !editing
  const loadingSub = isEdit && !editing && !notFound

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent
        className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto"
        initialFocus={nameRef}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEdit ? 'Edit subscription' : 'Add subscription'}
          </DialogTitle>
        </DialogHeader>

        {loadingSub ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <CircleNotch size={24} className="animate-spin" />
          </div>
        ) : notFound ? (
          <p className="py-4 text-muted-foreground">
            That subscription is gone. It may have been deleted.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-name">Name</Label>
              <Input
                ref={nameRef}
                id="sub-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Netflix, gym, Spotify..."
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-muted-foreground">
                  €
                </span>
                <input
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

            {/* Cycle */}
            <div className="flex flex-col gap-1.5">
              <Label>Billed</Label>
              <Segmented
                value={cycle}
                onChange={setCycle}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
              />
            </div>

            {/* Split */}
            <div className="flex flex-col gap-1.5">
              <Label>Split</Label>
              <Segmented
                value={splitType}
                onChange={setSplitType}
                options={[
                  { value: 'equal', label: 'Shared 50/50' },
                  { value: 'solo', label: 'Just you' },
                ]}
              />
              <p className="px-1 text-xs text-muted-foreground">
                {splitType === 'equal'
                  ? 'Shared subs show for both of you.'
                  : 'Solo subs are only visible to you.'}
              </p>
            </div>

            {/* Icon and color */}
            <div className="flex flex-col gap-1.5">
              <Label>Icon and color</Label>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-3 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-left transition-colors hover:bg-input"
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-800"
                  style={{ backgroundColor: colorTag || 'var(--muted)' }}
                >
                  <CategoryIcon name={icon} size={18} />
                </div>
                <span className="flex-1 text-muted-foreground">
                  Pick an icon and color
                </span>
                <CaretRight size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Active / paused (edit only) */}
            {isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Segmented
                  value={active}
                  onChange={setActive}
                  options={[
                    { value: true, label: 'Active' },
                    { value: false, label: 'Paused' },
                  ]}
                />
                <p className="px-1 text-xs text-muted-foreground">
                  Paused subs stay in the list but drop out of your totals.
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
                  'Add subscription'
                )}
              </Button>

              {isEdit &&
                (confirmingDelete ? (
                  <div className="flex flex-col gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-center text-sm text-muted-foreground">
                      Delete this subscription? There's no undo.
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
                    Delete subscription
                  </Button>
                ))}
            </div>
          </form>
        )}

        <IconColorPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          icon={icon}
          colorTag={colorTag}
          onIconChange={setIcon}
          onColorChange={setColorTag}
        />
      </DialogContent>
    </Dialog>
  )
}
