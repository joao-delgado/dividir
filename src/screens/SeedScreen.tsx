import { useEffect, useRef, useState } from 'react'
import { isSeeded, seedDatabase, type SeedUser } from '@/lib/seed'
import {
  parseSplitwiseCsv,
  readSplitwiseHeader,
  writeSplitwiseImport,
} from '@/lib/splitwiseImport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const emptyUser: SeedUser = { uid: '', name: '', colorTag: '#5B8DEF' }

// Dev-only, one-time setup utility. Registered at /seed only when
// import.meta.env.DEV is true, so it is never part of the production bundle.
// Fill in each person's Firebase Auth UID (Firebase console > Authentication)
// and a display name, then run it once, signed in, to write the two user
// profiles and the default category tree.
export default function SeedScreen() {
  const [seeded, setSeeded] = useState<boolean | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userA, setUserA] = useState<SeedUser>(emptyUser)
  const [userB, setUserB] = useState<SeedUser>({ ...emptyUser, colorTag: '#F178B6' })

  const csvFileRef = useRef<HTMLInputElement>(null)
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [personColumns, setPersonColumns] = useState<string[] | null>(null)
  const [colA, setColA] = useState('')
  const [colB, setColB] = useState('')
  const [csvError, setCsvError] = useState<string | null>(null)
  const [importRunning, setImportRunning] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    isSeeded()
      .then(setSeeded)
      .catch((e) => setError(String(e)))
  }, [])

  const canSubmit = userA.uid && userA.name && userB.uid && userB.name

  const run = async (force: boolean) => {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const { users, categories } = await seedDatabase([userA, userB], force)
      setResult(`Wrote ${users} users and ${categories} categories.`)
      setSeeded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const handleCsvFile = async (file: File | null) => {
    setCsvError(null)
    setCsvText(null)
    setPersonColumns(null)
    setImportResult(null)
    setImportError(null)
    setCsvFileName(file?.name ?? null)
    if (!file) return
    try {
      const text = await file.text()
      const columns = readSplitwiseHeader(text)
      setCsvText(text)
      setPersonColumns(columns)
      setColA(columns[0])
      setColB(columns[1])
    } catch (e) {
      setCsvError(e instanceof Error ? e.message : String(e))
    }
  }

  const runImport = async () => {
    if (!csvText || !colA || !colB || colA === colB) return
    setImportRunning(true)
    setImportResult(null)
    setImportError(null)
    try {
      const parsed = parseSplitwiseCsv(csvText, colA, colB)
      const summary = await writeSplitwiseImport(parsed, [userA, userB])
      const bits = [
        `Imported ${summary.expenses} expenses and ${summary.settlements} settlements.`,
      ]
      if (summary.skipped) {
        bits.push(`${summary.skipped} row(s) skipped (zero-balance or summary rows).`)
      }
      if (summary.fallbackCategories.length) {
        bits.push(
          `${summary.fallbackCategories.length} category name(s) not found, landed in General: ${summary.fallbackCategories.join(', ')}.`,
        )
      }
      if (summary.approximated) {
        bits.push(
          `${summary.approximated} row(s) had a split that wasn't 50/50 or solo, imported as equal, review these.`,
        )
      }
      setImportResult(bits.join(' '))
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    } finally {
      setImportRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-heading text-2xl font-semibold">First-time setup</h1>
      <p className="text-sm text-muted-foreground">
        Dev-only. Writes the two user profiles to the database.
        Get each UID from Firebase console &gt; Authentication.
      </p>

      <p className="text-sm">
        Status:{' '}
        {seeded === null
          ? 'checking...'
          : seeded
            ? 'categories already exist, but can be changed later'
            : 'empty, ready to seed'}
      </p>

      {[
        { label: 'Person 1', value: userA, set: setUserA },
        { label: 'Person 2', value: userB, set: setUserB },
      ].map(({ label, value, set }) => (
        <div key={label} className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium">{label}</p>
          <Input
            placeholder="Display name"
            value={value.name}
            onChange={(e) => set({ ...value, name: e.target.value })}
          />
          <Input
            placeholder="Firebase Auth UID"
            value={value.uid}
            onChange={(e) => set({ ...value, uid: e.target.value })}
          />
        </div>
      ))}

      <div className="flex gap-2 border-t border-border pt-4">
        <Button onClick={() => run(false)} disabled={running || !canSubmit}>
          {running ? 'Seeding...' : 'Seed database'}
        </Button>
        {seeded && (
          <Button
            variant="destructive"
            onClick={() => run(true)}
            disabled={running || !canSubmit}
          >
            Force reseed
          </Button>
        )}
      </div>

      {result && <p className="text-sm text-primary">{result}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm font-medium">Import from Splitwise (optional)</p>
        <p className="text-xs text-muted-foreground">
          Upload a Splitwise CSV export to bring existing history in. Only
          50/50 and fully-solo splits map cleanly, anything else is imported
          as 50/50 and flagged for review. Seed the database above first.
        </p>
        <input
          ref={csvFileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => csvFileRef.current?.click()}
          >
            Choose CSV file
          </Button>
          {csvFileName && (
            <span className="text-sm text-muted-foreground">{csvFileName}</span>
          )}
        </div>
        {csvError && <p className="text-sm text-destructive">{csvError}</p>}

        {personColumns && (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                {userA.name || 'Person 1'} is column
                <select
                  className="rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm"
                  value={colA}
                  onChange={(e) => setColA(e.target.value)}
                >
                  {personColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                {userB.name || 'Person 2'} is column
                <select
                  className="rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm"
                  value={colB}
                  onChange={(e) => setColB(e.target.value)}
                >
                  {personColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {colA === colB && (
              <p className="text-sm text-destructive">
                Pick two different columns.
              </p>
            )}
            <Button
              onClick={runImport}
              disabled={importRunning || !seeded || colA === colB}
            >
              {importRunning ? 'Importing...' : 'Import Splitwise data'}
            </Button>
          </>
        )}

        {importResult && <p className="text-sm text-primary">{importResult}</p>}
        {importError && <p className="text-sm text-destructive">{importError}</p>}
      </div>
    </div>
  )
}
