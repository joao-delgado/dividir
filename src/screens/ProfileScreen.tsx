import { useRef, useState } from 'react'
import {
  Camera,
  Check,
  CircleNotch,
  PiggyBank,
  SignOut,
  Trash,
} from '@phosphor-icons/react'
import { useAuth } from '@/lib/auth'
import { useUsers } from '@/lib/users'
import { updateUserAvatar, updateUserColor } from '@/lib/firestore'
import { fileToAvatarBase64 } from '@/lib/image'
import { CATEGORY_SWATCHES } from '@/lib/palette'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SavingsManagerDialog } from '@/components/SavingsManagerDialog'
import type { Icon } from '@phosphor-icons/react'

export default function ProfileScreen() {
  const { user, signOutUser } = useAuth()
  const { me, loading } = useUsers()

  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingsOpen, setSavingsOpen] = useState(false)

  const displayName = me?.name ?? user?.email ?? ''
  const initial = (me?.name ?? user?.email ?? '?').charAt(0).toUpperCase()
  const accent = me?.colorTag ?? 'var(--muted)'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = ''
    if (!file || !me) return

    setBusy(true)
    setError(null)
    try {
      const base64 = await fileToAvatarBase64(file)
      await updateUserAvatar(me.id, base64)
    } catch {
      setError("Couldn't update your photo. Try another one?")
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!me) return
    setBusy(true)
    setError(null)
    try {
      await updateUserAvatar(me.id, null)
    } catch {
      setError("Couldn't remove your photo. Try again?")
    } finally {
      setBusy(false)
    }
  }

  async function handleColor(color: string) {
    if (!me || color === me.colorTag) return
    setError(null)
    try {
      await updateUserColor(me.id, color)
    } catch {
      setError("Couldn't save that color. Try again?")
    }
  }

  const pickPhoto = () => fileRef.current?.click()

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky -top-px z-10">
        <header className="bg-muted px-4 pt-[calc(var(--spacing)*4+1px)] pb-2">
          <h1 className="font-heading text-2xl font-semibold">Profile</h1>
        </header>
        <div className="h-4 bg-linear-to-b from-muted to-muted/0" />
      </div>

      <div className="flex flex-col gap-4 px-4 pb-24">
        {/* Hero card: big avatar, name, email, tinted with the user's color. */}
        <div className="relative overflow-hidden rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border">
          {/* Soft color wash behind the avatar. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-24 opacity-40"
            style={{
              background: `linear-gradient(to bottom, ${accent}, transparent)`,
            }}
          />

          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              <button
                type="button"
                onClick={pickPhoto}
                disabled={busy || !me}
                aria-label="Change profile photo"
                className="size-24 overflow-hidden rounded-full ring-4 ring-card disabled:cursor-default"
                style={{ boxShadow: `0 0 0 2px ${accent}` }}
              >
                {me?.avatarBase64 ? (
                  <img
                    src={me.avatarBase64}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span
                    className="flex size-full items-center justify-center text-4xl font-semibold text-foreground/80"
                    style={{ backgroundColor: accent }}
                  >
                    {initial}
                  </span>
                )}
              </button>

              {/* Camera badge. pointer-events-none so taps fall through to the
                  avatar button underneath. */}
              <span className="pointer-events-none absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-foreground text-background ring-4 ring-card">
                {busy ? (
                  <CircleNotch size={15} className="animate-spin" />
                ) : (
                  <Camera size={15} weight="fill" />
                )}
              </span>
            </div>

            <p className="mt-4 font-heading text-2xl font-semibold">
              {loading && !me ? 'Loading...' : displayName}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Remove-photo action, settings-list style. Adding/changing a photo is
            done by tapping the avatar above. */}
        {me?.avatarBase64 && (
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <ActionRow
              icon={Trash}
              label="Remove photo"
              onClick={handleRemove}
              disabled={busy}
              destructive
            />
          </div>
        )}

        {/* Accent color: tints the hero, avatar ring, and this user's avatar
            fallback across the app. */}
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <h2 className="pb-3 text-sm font-medium text-muted-foreground">
            Your color
          </h2>
          <div className="flex flex-wrap gap-3">
            {CATEGORY_SWATCHES.map((swatch) => {
              const selected = swatch === me?.colorTag
              return (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => handleColor(swatch)}
                  disabled={!me}
                  aria-label={`Color ${swatch}`}
                  aria-pressed={selected}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full text-neutral-800 transition-transform active:scale-95 disabled:opacity-50',
                    selected &&
                      'ring-2 ring-foreground ring-offset-2 ring-offset-card',
                  )}
                  style={{ backgroundColor: swatch }}
                >
                  {selected && <Check size={16} weight="bold" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Savings manager: log or fix how much you put aside each month. Feeds
            the savings chart on Stats and the monthly Home prompt. */}
        {me && (
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <ActionRow
              icon={PiggyBank}
              label="Manage savings"
              onClick={() => setSavingsOpen(true)}
            />
          </div>
        )}

        {error && <p className="px-1 text-sm text-destructive">{error}</p>}

        {!loading && !me && (
          <p className="px-1 text-sm text-muted-foreground">
            No profile found for this account yet. Run the seed step to create it.
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />

        <Button
          variant="outline"
          size="lg"
          className="mt-2 w-full"
          onClick={() => signOutUser()}
        >
          <SignOut size={18} />
          Sign out
        </Button>
      </div>

      {me && (
        <SavingsManagerDialog
          me={me}
          open={savingsOpen}
          onOpenChange={setSavingsOpen}
        />
      )}
    </div>
  )
}

function ActionRow({
  icon: IconComponent,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: Icon
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
    >
      <IconComponent
        size={20}
        className={destructive ? 'text-destructive' : 'text-muted-foreground'}
      />
      <span
        className={destructive ? 'text-destructive' : 'text-foreground'}
      >
        {label}
      </span>
    </button>
  )
}
