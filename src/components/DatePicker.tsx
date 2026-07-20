import { useMemo, useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { dateStr, fullDate, splitDate, todayStr } from '@/lib/format'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// A date picker styled with our design system instead of the device's native
// one. Works entirely on "YYYY-MM-DD" strings (no time/zone), matching how dates
// are stored everywhere else. Opens as a popover anchored to the trigger, so it
// works even nested inside the Add Expense dialog.
export function DatePicker({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (next: string) => void
  id?: string
}) {
  const [open, setOpen] = useState(false)
  // The month being viewed. Starts on the selected date's month; resets to it
  // each time the popover opens so it never drifts away from the current value.
  const [view, setView] = useState(() => {
    const { year, month } = splitDate(value)
    return { year, month }
  })

  const today = todayStr()

  const grid = useMemo(() => {
    const { year, month } = view
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    // Monday-first offset: JS getDay() is 0=Sun..6=Sat.
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
    const cells: (string | null)[] = []
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(dateStr(year, month, d))
    return cells
  }, [view])

  function step(delta: number) {
    setView((v) => {
      const next = new Date(v.year, v.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function pick(day: string) {
    onChange(day)
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const { year, month } = splitDate(value)
          setView({ year, month })
        }
        setOpen(next)
      }}
    >
      <Popover.Trigger
        id={id}
        className="flex items-center justify-between rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-left transition-colors hover:bg-input data-popup-open:bg-input"
      >
        <span>{fullDate(value)}</span>
        <CaretRight size={18} className="text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-50">
          <Popover.Popup className="w-[19rem] rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between px-1 pb-2">
              <button
                type="button"
                onClick={() => step(-1)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Previous month"
              >
                <CaretLeft size={18} />
              </button>
              <span className="text-sm font-medium">
                {MONTHS[view.month]} {view.year}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Next month"
              >
                <CaretRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {w}
                </div>
              ))}
              {grid.map((day, i) =>
                day === null ? (
                  <div key={`empty-${i}`} />
                ) : (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pick(day)}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                      day === value
                        ? 'bg-primary font-medium text-primary-foreground'
                        : 'hover:bg-muted',
                      day !== value &&
                        day === today &&
                        'font-medium text-primary',
                    )}
                  >
                    {splitDate(day).day}
                  </button>
                ),
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
