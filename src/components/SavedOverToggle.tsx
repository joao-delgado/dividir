import { cn } from '@/lib/utils'

// The Saved / Went over switch for logging savings. Same pill shape as the
// SegmentedControl, but the active side lights up in its own meaning color:
// green for saved, orange for overspent, matching the calendar tiles.
export function SavedOverToggle({
  value,
  onChange,
}: {
  value: 'saved' | 'over'
  onChange: (value: 'saved' | 'over') => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange('saved')}
        aria-pressed={value === 'saved'}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
          value === 'saved'
            ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Saved
      </button>
      <button
        type="button"
        onClick={() => onChange('over')}
        aria-pressed={value === 'over'}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
          value === 'over'
            ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-800'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Went over
      </button>
    </div>
  )
}
