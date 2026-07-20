import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { periodLabel, shiftPeriod, type Period, type PeriodMode } from '@/lib/stats'
import { SegmentedControl } from '@/components/stats/SegmentedControl'

// The Stats period control: a Month/Year switch on top, and a labelled
// prev/next stepper below. Stepping keeps whichever mode is active.
export function PeriodSelector({
  period,
  onChange,
}: {
  period: Period
  onChange: (period: Period) => void
}) {
  return (
    <div className="rounded-3xl bg-card p-3 shadow-sm ring-1 ring-border">
      <SegmentedControl<PeriodMode>
        className="flex w-full [&>button]:flex-1"
        segments={[
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
        ]}
        value={period.mode}
        onChange={(mode) => onChange({ ...period, mode })}
      />

      <div className="mt-2 flex items-center justify-between">
        <StepButton
          label="Previous"
          onClick={() => onChange(shiftPeriod(period, -1))}
        >
          <CaretLeft size={18} weight="bold" />
        </StepButton>
        <span className="font-heading text-lg font-semibold">
          {periodLabel(period)}
        </span>
        <StepButton
          label="Next"
          onClick={() => onChange(shiftPeriod(period, 1))}
        >
          <CaretRight size={18} weight="bold" />
        </StepButton>
      </div>
    </div>
  )
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
    >
      {children}
    </button>
  )
}
