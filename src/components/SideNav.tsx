import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChartBar, CreditCard, House, Plus, User } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/stats', label: 'Stats', icon: ChartBar, end: false },
  { to: '/subscriptions', label: 'Subs', icon: CreditCard, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
]

// The desktop counterpart to BottomNav: a fixed left rail with the app brand, a
// prominent "Add expense" button, and the same four tabs stacked vertically.
// Hidden below md, where BottomNav takes over. Mobile is left untouched.
export function SideNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-background px-3 py-5 md:flex">
      <div className="flex items-center gap-2 px-2 pb-5">
        <img src="/favicon/favicon-96x96.png" alt="" className="size-6" />
        <span className="font-heading text-xl font-semibold text-foreground">
          Dividir por Dois
        </span>
      </div>

      <button
        type="button"
        onClick={() =>
          navigate('/add', { state: { backgroundLocation: location } })
        }
        className="mb-3 flex items-center justify-center gap-2 rounded-full bg-foreground py-2.5 text-sm font-medium text-background transition-transform active:scale-[0.98]"
      >
        <Plus size={18} weight="bold" />
        Add expense
      </button>

      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
