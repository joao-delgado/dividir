import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The shared card shell every Stats panel sits in: rounded surface, hairline
// ring, soft shadow. An optional title/action header keeps the panels uniform.
export function StatCard({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border',
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && (
            <h2 className="text-sm font-medium text-muted-foreground">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
