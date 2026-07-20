import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App.tsx'
import { AuthProvider } from '@/lib/auth'
import { UsersProvider } from '@/lib/users'
import { CategoriesProvider } from '@/lib/categories'
import { LedgerProvider } from '@/lib/ledger'
import { SavingsProvider } from '@/lib/savings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <UsersProvider>
        <CategoriesProvider>
          <LedgerProvider>
            <SavingsProvider>
              <App />
            </SavingsProvider>
          </LedgerProvider>
        </CategoriesProvider>
      </UsersProvider>
    </AuthProvider>
  </StrictMode>,
)
