import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth'
import { subscribeSavings } from '@/lib/firestore'
import type { Saving } from '@/lib/types'

// Holds every savings entry (both people, all months). Home reads it for the
// monthly prompt, Stats for the bar chart, and Profile for the manager modal.
interface SavingsContextValue {
  savings: Saving[]
  loading: boolean
}

const SavingsContext = createContext<SavingsContextValue | undefined>(undefined)

export function SavingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [savings, setSavings] = useState<Saving[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSavings([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeSavings((next) => {
      setSavings(next)
      setLoading(false)
    })
    return unsubscribe
  }, [user])

  return (
    <SavingsContext.Provider value={{ savings, loading }}>
      {children}
    </SavingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSavings() {
  const ctx = useContext(SavingsContext)
  if (!ctx) {
    throw new Error('useSavings must be used within a SavingsProvider')
  }
  return ctx
}
