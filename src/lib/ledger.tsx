import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth'
import { subscribeExpenses, subscribeSettlements } from '@/lib/firestore'
import type { Expense, Settlement } from '@/lib/types'

// Holds the full expense and settlement history (both date-desc). Home derives
// the unsettled slice and balance from these; Stats and Add Expense reuse them.
// Volume is modest (a two-person household), so subscribing to everything and
// computing client-side is cheap and keeps queries simple.
interface LedgerContextValue {
  expenses: Expense[]
  settlements: Settlement[]
  loading: boolean
}

const LedgerContext = createContext<LedgerContextValue | undefined>(undefined)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setExpenses([])
      setSettlements([])
      setLoading(false)
      return
    }
    setLoading(true)
    let gotExpenses = false
    let gotSettlements = false
    const settle = () => {
      if (gotExpenses && gotSettlements) setLoading(false)
    }
    const unsubExpenses = subscribeExpenses((next) => {
      setExpenses(next)
      gotExpenses = true
      settle()
    })
    const unsubSettlements = subscribeSettlements((next) => {
      setSettlements(next)
      gotSettlements = true
      settle()
    })
    return () => {
      unsubExpenses()
      unsubSettlements()
    }
  }, [user])

  return (
    <LedgerContext.Provider value={{ expenses, settlements, loading }}>
      {children}
    </LedgerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLedger() {
  const ctx = useContext(LedgerContext)
  if (!ctx) {
    throw new Error('useLedger must be used within a LedgerProvider')
  }
  return ctx
}
