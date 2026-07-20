import { NavLink } from 'react-router-dom'
import { ChartBar, CreditCard, House, User } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/stats', label: 'Stats', icon: ChartBar, end: false },
  { to: '/subscriptions', label: 'Subs', icon: CreditCard, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
]

export function BottomNav() {
  return (
    <nav className="flex shrink-0 border-t border-border bg-background md:hidden">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 pt-2.5 pb-7.5 text-xs font-medium transition-colors',
              isActive ? 'text-foreground' : 'text-muted-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={24} weight={isActive ? 'fill' : 'regular'} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
