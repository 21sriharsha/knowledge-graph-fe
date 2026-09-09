'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Choice = 'light' | 'dark' | 'system'

/**
 * Theme control: light, dark, or follow the system.
 *
 * Three states rather than a two-way switch. A binary toggle silently discards the reader's OS
 * preference the first time they touch it, with no way back to "whatever my machine says".
 *
 * Renders a stable placeholder until mounted — the stored choice lives in localStorage, which the
 * server cannot know, so rendering the real state immediately would be a hydration mismatch.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    setChoice(stored === 'dark' || stored === 'light' ? stored : 'system')
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = choice === 'system' ? media.matches : choice === 'dark'
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    // Following the system means following it as it changes, not just at load.
    if (choice === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [choice, mounted])

  function select(next: Choice) {
    setChoice(next)
    if (next === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', next)
  }

  const options: { value: Choice; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ]

  if (!mounted) {
    return <div className="h-8 w-[5.75rem] rounded-md border border-border" aria-hidden="true" />
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-md border border-border p-0.5"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => select(value)}
          className={`grid h-7 w-7 place-items-center rounded transition-none ${
            choice === value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  )
}
