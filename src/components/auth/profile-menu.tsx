'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * The signed-in person's avatar, and what they can do with their account.
 *
 * Replaces a bare "Sign out" in the header. Sign-out was the only account action visible, which put
 * the most destructive thing one click away and left nowhere to add the rest.
 *
 * The picture comes from whichever identity provider they used. Providers disagree about where they
 * put it, so several claims are tried before falling back to initials — an avatar that silently
 * fails to load is worse than one that was never attempted, because a broken image looks like a
 * broken page.
 */
export function ProfileMenu({
  email,
  displayName,
  avatarUrl,
}: {
  email: string | null
  displayName: string | null
  avatarUrl: string | null
}) {
  const [open, setOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  const label = displayName?.trim() || email || 'Account'

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Focus goes back to the control that opened the menu, or the reader loses their place.
      buttonRef.current?.focus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xs font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        {/* The accessible name is the person, not "open menu": a screen reader should say whose
            account this is, which is the thing the avatar conveys visually. */}
        <span className="sr-only">{label} — account menu</span>
        {avatarUrl && !imageFailed ? (
          // A plain img rather than next/image: the host is whichever provider they signed in with,
          // and enumerating every possible IdP domain in next.config to show a 32px avatar is not a
          // trade worth making. no-referrer so the provider is not told which page they are on.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden="true">{initialsOf(label)}</span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            {displayName ? <p className="truncate text-sm font-medium">{displayName}</p> : null}
            {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
          </div>

          <div className="py-1">
            <Link
              href="/studio"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-muted"
            >
              Studio
            </Link>
            <Link
              href="/studio/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-muted"
            >
              Account settings
            </Link>
          </div>

          <form action="/auth/signout" method="post" className="border-t border-border">
            {/* POST, not a link: a GET that ends a session can be fired by any prefetch. */}
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

/** Two letters at most: more than that stops reading as a monogram and starts reading as a word. */
function initialsOf(label: string): string {
  const words = label.replace(/@.*$/, '').split(/[\s._-]+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
