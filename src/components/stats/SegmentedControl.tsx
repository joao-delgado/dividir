import { cn } from '@/lib/utils'

// A small pill-shaped segmented toggle: a muted track with the active segment
// lifted onto a card surface. Used for the Month/Year switch and the list
// filters on the Stats screen.
export interface Segment<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className,
  size = 'md',
}: {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-muted p-1',
        className,
      )}
    >
      {segments.map((seg) => {
        const active = seg.value === value
        return (
          <button
            key={seg.value}
            type="button"
            onClick={() => onChange(seg.value)}
            className={cn(
              'rounded-full font-medium transition-colors',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
