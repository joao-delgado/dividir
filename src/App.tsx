import { Suspense, lazy, useEffect, useRef } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  type Location,
} from 'react-router-dom'
import { CircleNotch, Plus } from '@phosphor-icons/react'
import { useAuth } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'
import { SideNav } from '@/components/SideNav'
import LoginScreen from '@/screens/LoginScreen'
import HomeScreen from '@/screens/HomeScreen'
// Stats pulls in Recharts, which is heavy and only needed on this one tab.
// Lazy-loading it keeps that weight out of the initial bundle.
const StatsScreen = lazy(() => import('@/screens/StatsScreen'))
import ProfileScreen from '@/screens/ProfileScreen'
import AddExpenseScreen from '@/screens/AddExpenseScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import SettlementsHistoryScreen from '@/screens/SettlementsHistoryScreen'
import SubscriptionsScreen from '@/screens/SubscriptionsScreen'
import AddSubscriptionScreen from '@/screens/AddSubscriptionScreen'
import SeedScreen from '@/screens/SeedScreen'

function FullScreenLoader() {
  return (
    <div className="flex h-svh items-center justify-center text-muted-foreground">
      <CircleNotch size={28} className="animate-spin" />
    </div>
  )
}

// Wraps the three tabs. Redirects to /login when signed out, and holds the
// phone-width column layout with the bottom tab bar.
function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)

  // The <main> scroll container persists across route changes (only its
  // children swap), so without this the next page keeps whatever scroll
  // position the last one was left at instead of opening at the top.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />

  const showFab = location.pathname === '/'

  return (
    // On desktop this becomes a row: a fixed sidebar rail plus the app column.
    // Below md the sidebar is hidden and this collapses back to the original
    // phone-width column, so the mobile layout is unchanged.
    <div className="flex h-svh w-full md:bg-background">
      <SideNav />

      <div className="relative mx-auto flex h-full w-full max-w-md flex-col bg-muted md:mx-0 md:max-w-none md:flex-1">
        <main
          ref={mainRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {/* Centers each screen in a readable column on wide viewports. h-full
              keeps the screens' `min-h-full` chain resolving as it did when they
              sat directly under <main>. */}
          <div className="mx-auto h-full w-full max-w-md md:max-w-2xl">
            <Outlet />
          </div>
        </main>

        {showFab && (
          <button
            type="button"
            onClick={() =>
              navigate('/add', { state: { backgroundLocation: location } })
            }
            aria-label="Add expense"
            className="absolute right-4 bottom-26 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform active:scale-95 md:hidden"
          >
            <Plus size={26} weight="bold" />
          </button>
        )}

        <BottomNav />
      </div>
    </div>
  )
}

// The login route. Bounces already-signed-in users straight to Home.
function LoginRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (user) return <Navigate to="/" replace />
  return <LoginScreen />
}

// The Add / Edit Expense screen is a modal that floats over whatever tab you
// were on. We do that with the "background location" pattern: when you open it,
// we stash the page you were on in `location.state.backgroundLocation`, render
// the tabs from that stashed location, and render the modal route on top. Opened
// directly (a shared link, a refresh), there's no background, so the modal route
// falls through to the tab layout and simply shows on its own.
function AppRoutes() {
  const location = useLocation()
  const state = location.state as { backgroundLocation?: Location } | null
  const backgroundLocation = state?.backgroundLocation

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<HomeScreen />} />
          <Route
            path="stats"
            element={
              <Suspense fallback={<FullScreenLoader />}>
                <StatsScreen />
              </Suspense>
            }
          />
          <Route path="subscriptions" element={<SubscriptionsScreen />} />
          <Route path="subscriptions/add" element={<AddSubscriptionScreen />} />
          <Route path="subscriptions/:id" element={<AddSubscriptionScreen />} />
          <Route path="profile" element={<ProfileScreen />} />
          <Route path="add" element={<AddExpenseScreen />} />
          <Route path="expense/:id" element={<AddExpenseScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="settlements" element={<SettlementsHistoryScreen />} />
          {/* Dev-only: excluded from production builds. */}
          {import.meta.env.DEV && (
            <Route path="seed" element={<SeedScreen />} />
          )}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="add" element={<AddExpenseScreen />} />
          <Route path="expense/:id" element={<AddExpenseScreen />} />
          <Route path="subscriptions/add" element={<AddSubscriptionScreen />} />
          <Route path="subscriptions/:id" element={<AddSubscriptionScreen />} />
        </Routes>
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
