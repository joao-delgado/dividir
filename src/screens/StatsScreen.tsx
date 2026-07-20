import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CircleNotch,
  DownloadSimple,
  ChartBar,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import { useUsers } from '@/lib/users'
import { useCategories } from '@/lib/categories'
import { useLedger } from '@/lib/ledger'
import { useSavings } from '@/lib/savings'
import { lastCompletedPeriod, savingsChartForPeriod } from '@/lib/savingsStats'
import { subscribeBudgets } from '@/lib/firestore'
import { categoryLabel, resolveCategoryColor } from '@/lib/categoryTree'
import { formatCurrency } from '@/lib/format'
import {
  budgetVsActual,
  categoryBreakdown,
  cumulativeByPerson,
  currentPeriod,
  expensesInPeriod,
  expensesToCsv,
  downloadCsv,
  monthlyTrend,
  periodLabel,
  periodPrefix,
  shiftPeriod,
  spendByPayer,
  totalSpend,
  type CategorySlice,
  type Period,
} from '@/lib/stats'
import type { Budget } from '@/lib/types'
import { PeriodSelector } from '@/components/stats/PeriodSelector'
import { StatCard } from '@/components/stats/StatCard'
import { SegmentedControl } from '@/components/stats/SegmentedControl'
import { SpendTrendChart } from '@/components/stats/SpendTrendChart'
import { CategoryPieChart } from '@/components/stats/CategoryPieChart'
import { SavingsChart } from '@/components/stats/SavingsChart'
import { CategoryDetailDialog } from '@/components/stats/CategoryDetailDialog'
import { CumulativeLineChart } from '@/components/stats/CumulativeLineChart'
import { BudgetVsActual } from '@/components/stats/BudgetVsActual'
import { PayerSplit } from '@/components/stats/PayerSplit'
import { StatsExpenseRow } from '@/components/stats/StatsExpenseRow'

type PayerFilter = 'both' | 'me' | 'partner'

export default function StatsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { me, partner, users } = useUsers()
  const { byId } = useCategories()
  const { expenses, loading } = useLedger()
  const { savings } = useSavings()

  const [period, setPeriod] = useState<Period>(() => currentPeriod('month'))
  // The savings card carries its own period, independent of the one above it.
  const [savingsPeriod, setSavingsPeriod] = useState<Period>(() =>
    lastCompletedPeriod(),
  )
  const [payerFilter, setPayerFilter] = useState<PayerFilter>('both')
  const [soloOnly, setSoloOnly] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [detailSlice, setDetailSlice] = useState<CategorySlice | null>(null)

  // Budgets are standing (same every month) and only shown in month view.
  useEffect(() => {
    if (period.mode !== 'month') {
      setBudgets([])
      return
    }
    return subscribeBudgets(setBudgets)
  }, [period.mode])

  const periodExpenses = useMemo(
    () => expensesInPeriod(expenses, period),
    [expenses, period],
  )

  const trend = useMemo(() => monthlyTrend(expenses, period), [expenses, period])
  const savingsData = useMemo(
    () => savingsChartForPeriod(savings, savingsPeriod, me?.id, partner?.id),
    [savings, savingsPeriod, me?.id, partner?.id],
  )
  const slices = useMemo(
    () => categoryBreakdown(periodExpenses, byId),
    [periodExpenses, byId],
  )
  const payerTotals = useMemo(() => spendByPayer(periodExpenses), [periodExpenses])
  const cumulative = useMemo(
    () => cumulativeByPerson(periodExpenses, period, me?.id, partner?.id),
    [periodExpenses, period, me?.id, partner?.id],
  )
  const budgetRows = useMemo(
    () => budgetVsActual(periodExpenses, budgets, byId),
    [periodExpenses, budgets, byId],
  )

  // Filters apply to the list (and CSV), not the charts.
  const filtered = useMemo(() => {
    return periodExpenses.filter((e) => {
      if (soloOnly && e.splitType !== 'solo') return false
      if (payerFilter === 'me' && e.paidBy !== me?.id) return false
      if (payerFilter === 'partner' && e.paidBy !== partner?.id) return false
      return true
    })
  }, [periodExpenses, soloOnly, payerFilter, me?.id, partner?.id])

  const total = totalSpend(periodExpenses)
  const isEmpty = periodExpenses.length === 0
  // Only surface the savings section once someone has actually logged savings,
  // otherwise it's just an empty chart taking up space.
  const hasSavings = savings.length > 0

  // Standing budgets, month view only. Rendered below the pie, and kept visible
  // even when the month has no expenses yet (bars just sit at 0%).
  const budgetCard =
    period.mode === 'month' && budgetRows.length > 0 ? (
      <StatCard title={`Budget · ${periodLabel(period)}`}>
        <BudgetVsActual rows={budgetRows} />
      </StatCard>
    ) : null

  const nameOf = (id: string) =>
    users.find((u) => u.id === id)?.name ?? 'Unknown'

  const handleExport = () => {
    if (filtered.length === 0) return
    const csv = expensesToCsv(filtered, byId, nameOf)
    downloadCsv(`dividir-${periodPrefix(period)}.csv`, csv)
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky -top-px z-10">
        <div className="space-y-2 bg-muted px-4 pt-[calc(var(--spacing)*4+1px)] pb-2">
          <h1 className="font-heading text-2xl font-semibold">Stats</h1>
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
        <div className="h-4 bg-linear-to-b from-muted to-muted/0" />
      </div>

      <div className="space-y-4 px-4 pt-2 pb-24">
        {loading && expenses.length === 0 ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <CircleNotch size={24} className="animate-spin" />
          </div>
        ) : (
          <>
            <StatCard title="Spend trend">
              <SpendTrendChart data={trend} />
            </StatCard>

            {isEmpty ? (
              <>
                {budgetCard}
                <StatCard>
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                    <ChartBar size={28} />
                    <p className="text-sm">
                      No expenses this {period.mode}. Try another {period.mode}.
                    </p>
                  </div>
                </StatCard>
              </>
            ) : (
              <>
                <StatCard
                  title={`By category · ${periodLabel(period)}`}
                >
                  <CategoryPieChart
                    slices={slices}
                    onSelectSlice={setDetailSlice}
                  />
                </StatCard>

                {budgetCard}

                <StatCard title="Who paid">
                  <PayerSplit
                    me={me}
                    partner={partner}
                    meTotal={me ? payerTotals.get(me.id) ?? 0 : 0}
                    partnerTotal={partner ? payerTotals.get(partner.id) ?? 0 : 0}
                  />
                </StatCard>

                {period.mode === 'month' && (
                  <StatCard title="Cumulative spend">
                    <CumulativeLineChart
                      data={cumulative}
                      meName="You"
                      partnerName={partner?.name ?? 'Partner'}
                      meColor={me?.colorTag ?? 'var(--primary)'}
                      partnerColor={partner?.colorTag ?? '#f59e0b'}
                    />
                  </StatCard>
                )}

                {hasSavings && (
                <StatCard title="Savings">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <SegmentedControl<'month' | 'year'>
                      size="sm"
                      segments={[
                        { value: 'month', label: '6 months' },
                        { value: 'year', label: 'Year' },
                      ]}
                      value={savingsPeriod.mode}
                      onChange={(mode) =>
                        setSavingsPeriod((p) => ({ ...p, mode }))
                      }
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Previous"
                        onClick={() =>
                          setSavingsPeriod((p) => shiftPeriod(p, -1))
                        }
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                      >
                        <CaretLeft size={16} weight="bold" />
                      </button>
                      <span className="min-w-24 text-center text-sm font-medium tabular-nums">
                        {savingsPeriod.mode === 'year'
                          ? savingsPeriod.year
                          : periodLabel(savingsPeriod)}
                      </span>
                      <button
                        type="button"
                        aria-label="Next"
                        onClick={() =>
                          setSavingsPeriod((p) => shiftPeriod(p, 1))
                        }
                        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                      >
                        <CaretRight size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                  <SavingsChart
                    data={savingsData}
                    meName="You"
                    partnerName={partner?.name ?? 'Partner'}
                    meColor={me?.colorTag ?? 'var(--primary)'}
                    partnerColor={partner?.colorTag ?? '#f59e0b'}
                  />
                </StatCard>
                )}

                <StatCard
                  title={`Expenses · ${formatCurrency(total)}`}
                  action={
                    <button
                      type="button"
                      onClick={handleExport}
                      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                    >
                      <DownloadSimple size={14} weight="bold" />
                      CSV
                    </button>
                  }
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <SegmentedControl<PayerFilter>
                      size="sm"
                      segments={[
                        { value: 'both', label: 'Both' },
                        { value: 'me', label: 'You' },
                        {
                          value: 'partner',
                          label: partner?.name ?? 'Partner',
                        },
                      ]}
                      value={payerFilter}
                      onChange={setPayerFilter}
                    />
                    <SegmentedControl<'all' | 'solo'>
                      size="sm"
                      segments={[
                        { value: 'all', label: 'All' },
                        { value: 'solo', label: 'Solo' },
                      ]}
                      value={soloOnly ? 'solo' : 'all'}
                      onChange={(v) => setSoloOnly(v === 'solo')}
                    />
                  </div>

                  {filtered.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nothing matches these filters.
                    </p>
                  ) : (
                    <div className="-mx-1 divide-y divide-border">
                      {filtered.map((e) => {
                        const cat = byId.get(e.categoryId)
                        return (
                          <StatsExpenseRow
                            key={e.id}
                            expense={e}
                            categoryLabel={
                              cat ? categoryLabel(byId, cat) : 'Uncategorized'
                            }
                            categoryIcon={cat?.icon}
                            categoryColor={resolveCategoryColor(byId, cat)}
                            payer={users.find((u) => u.id === e.paidBy)}
                            me={me}
                            onClick={() =>
                              navigate(`/expense/${e.id}`, {
                                state: { backgroundLocation: location },
                              })
                            }
                          />
                        )
                      })}
                    </div>
                  )}
                </StatCard>
              </>
            )}
          </>
        )}
      </div>

      <CategoryDetailDialog
        slice={detailSlice}
        periodLabel={periodLabel(period)}
        expenses={periodExpenses}
        byId={byId}
        users={users}
        me={me}
        onOpenChange={(open) => {
          if (!open) setDetailSlice(null)
        }}
        onSelectExpense={(e) => {
          setDetailSlice(null)
          navigate(`/expense/${e.id}`, {
            state: { backgroundLocation: location },
          })
        }}
      />
    </div>
  )
}
