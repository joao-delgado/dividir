import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/lib/auth'
import { subscribeUsers } from '@/lib/firestore'
import type { UserProfile } from '@/lib/types'

interface UsersContextValue {
  /** Both profiles (empty until the users docs are seeded). */
  users: UserProfile[]
  /** The signed-in user's profile, or null if not found / signed out. */
  me: UserProfile | null
  /** The other household member (there are only ever two). */
  partner: UserProfile | null
  loading: boolean
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined)

export function UsersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only read users while signed in; the rules deny it otherwise.
    if (!user) {
      setUsers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeUsers((next) => {
      setUsers(next)
      setLoading(false)
    })
    return unsubscribe
  }, [user])

  const me = user ? users.find((u) => u.id === user.uid) ?? null : null
  const partner = user ? users.find((u) => u.id !== user.uid) ?? null : null

  return (
    <UsersContext.Provider value={{ users, me, partner, loading }}>
      {children}
    </UsersContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) {
    throw new Error('useUsers must be used within a UsersProvider')
  }
  return ctx
}
