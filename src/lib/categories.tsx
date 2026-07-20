import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth'
import { subscribeCategories } from '@/lib/firestore'
import type { Category } from '@/lib/types'

interface CategoriesContextValue {
  categories: Category[]
  byId: Map<string, Category>
  loading: boolean
}

const CategoriesContext = createContext<CategoriesContextValue | undefined>(
  undefined,
)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setCategories([])
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeCategories((next) => {
      setCategories(next)
      setLoading(false)
    })
  }, [user])

  const byId = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  return (
    <CategoriesContext.Provider value={{ categories, byId, loading }}>
      {children}
    </CategoriesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) {
    throw new Error('useCategories must be used within a CategoriesProvider')
  }
  return ctx
}
