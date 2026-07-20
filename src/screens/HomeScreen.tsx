import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Gear, CircleNotch, Receipt } from '@phosphor-icons/react'
import { useUsers } from '@/lib/users'
import { useCategories } from '@/lib/categories'
import { useLedger } from '@/lib/ledger'
import { useSavings } from '@/lib/savings'
import { totalBalanceCents, unsettledExpenses } from '@/lib/balance'
import { resolveCategoryColor } from '@/lib/categoryTree'
import { monthYearKey, monthYearLabel } from '@/lib/format'
import { lastCompletedMonthKey, savingFor } from '@/lib/savingsStats'
import type { Expense } from '@/lib/types'
import { BalanceCard } from '@/components/BalanceCard'
import { SavingsPromptCard } from '@/components/SavingsPromptCard'
import { ExpenseRow } from '@/components/ExpenseRow'

export default function HomeScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { me, partner, loading: usersLoading } = useUsers()
  const { byId } = useCategories()
  const { expenses, settlements, loading: ledgerLoading } = useLedger()
  const { savings, loading: savingsLoading } = useSavings()

  // Until users and the ledger have both loaded, the balance is unknown, not
  // zero. Rendering the card early would flash "all settled up" before the real
  // balance arrives, so hold the whole view behind a splash until data is ready.
  const loading = usersLoading || ledgerLoading

  const unsettled = useMemo(
    () => unsettledExpenses(expenses, settlements),
    [expenses, settlements],
  )

  // Group unsettled expenses by month (already date-desc from the query).
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of unsettled) {
      const list = map.get(monthYearKey(e.date))
      if (list) list.push(e)
      else map.set(monthYearKey(e.date), [e])
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: monthYearLabel(items[0].date),
      items,
    }))
  }, [unsettled])

  const netCents = me ? totalBalanceCents(unsettled, me.id) : 0

  // Prompt for last month's savings until it's logged (or dismissed for that
  // month). The card handles the dismiss layer itself.
  const lastMonth = lastCompletedMonthKey()
  const needsSavings =
    !!me && !savingsLoading && !savingFor(savings, me.id, lastMonth)

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky -top-px z-10">
        <header className="flex items-center justify-between bg-muted px-4 pt-[calc(var(--spacing)*4+1px)] pb-2">
          <h1 className="font-heading text-2xl font-semibold">Dividir por Dois</h1>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Settings"
          >
            <Gear size={24} />
          </button>
        </header>
        <div className="h-4 bg-linear-to-b from-muted to-muted/0" />
      </div>

      <div className="px-4 pb-28">
        {loading ? (
          <div className="flex min-h-[50svh] items-center justify-center text-muted-foreground">
            <CircleNotch size={28} className="animate-spin" />
          </div>
        ) : (
          <>
            {me && needsSavings && (
              <SavingsPromptCard me={me} monthKey={lastMonth} />
            )}

            <BalanceCard me={me} partner={partner} netCents={netCents} />

            {unsettled.length === 0 ? (
              <p className="px-1 pt-8 text-center text-sm text-muted-foreground">
                No expenses since your last settle up.
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.key}>
                  <h2 className="px-1 pt-5 pb-2 text-sm font-medium text-muted-foreground">
                    {group.label}
                  </h2>
                  <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
                    {group.items.map((expense) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        me={me}
                        partner={partner}
                        categoryIcon={byId.get(expense.categoryId)?.icon}
                        categoryColor={resolveCategoryColor(
                          byId,
                          byId.get(expense.categoryId),
                        )}
                        onClick={() =>
                          navigate(`/expense/${expense.id}`, {
                            state: { backgroundLocation: location },
                          })
                        }
                      />
                    ))}
                  </div>
                </section>
              ))
            )}

            {settlements.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/settlements')}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <Receipt size={18} />
                Settlement history
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
