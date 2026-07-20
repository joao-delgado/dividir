import { useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      // On success, onAuthStateChanged flips the app over to the tabs.
    } catch {
      setError("That email and password didn't work. Give it another go.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // Soft neutral wash so the card floats on the same palette as the rest of the app.
    // The gradient starts on plain `muted` (matching the status bar theme-color),
    // then eases through a faint lime tint before settling into `background`.
    <div className="flex min-h-svh w-full flex-col items-center gap-8 bg-muted bg-linear-to-b from-muted via-[color-mix(in_oklch,var(--muted),var(--primary)_14%)] to-background p-6 pt-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/favicon/icon.svg" alt="" className="size-20 rounded-2xl" />
        <span className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Dividir por Dois
        </span>
      </div>

      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={submitting} className="mt-2">
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
