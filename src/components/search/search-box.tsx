'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import type { SearchSuggestion, SearchSuggestionsResponse } from '@/lib/types'

/**
 * The search input, present in the header on every page and again as the landing page's hero.
 *
 * It submits to `/search?q=…`, a real URL, so results stay linkable, shareable and back-buttonable.
 * The suggestion list is a shortcut past that page, not a replacement for it: the backend still
 * decides how a query is retrieved (FRONTEND-SPEC §6), and every path through this component ends
 * either on an article or on the full results page.
 *
 * Rules the dropdown follows, all from the golden rule:
 *
 * - It only appears once it has something to say. No empty box under a one-letter query.
 * - It never eats the Enter key. Enter with nothing highlighted goes to the results page, exactly
 *   as it did before suggestions existed.
 * - A failed or slow lookup is silent. Typing must not be interrupted by an error the reader did
 *   not ask for and cannot act on.
 */
export function SearchBox({
  className = '',
  size = 'default',
}: {
  className?: string
  /** `hero` is the landing page's primary call to action; `default` is the header. */
  size?: 'default' | 'hero'
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const hero = size === 'hero'

  // Unique per instance: the header and the hero are both on screen on the landing page, and
  // duplicate element ids would break the combobox's ARIA wiring for whichever one lost.
  const id = useId()
  const listboxId = `${id}-suggestions`

  // Keep the box in step with the URL, so the back button leaves the input showing the query that
  // actually produced the results on screen.
  useEffect(() => {
    setValue(params.get('q') ?? '')
    setOpen(false)
  }, [params])

  // "/" focuses search from anywhere, the convention on documentation and code-search sites.
  // Ignored while typing in another field, so it never eats a literal slash.
  useEffect(() => {
    const target = { input: inputRef, priority: hero ? 1 : 0 }
    shortcutTargets.add(target)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const active = document.activeElement
      const isEditable =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      if (isEditable) return
      event.preventDefault()
      // Every mounted box hears this, so they all agree on one winner rather than racing to focus
      // themselves. On the landing page that is the hero, which is what the reader is looking at.
      const winner = [...shortcutTargets].sort((a, b) => b.priority - a.priority)[0]
      winner?.input.current?.focus()
      winner?.input.current?.select()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      shortcutTargets.delete(target)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [hero])

  // Debounced lookup. The timer keeps a fast typist to one request per pause rather than one per
  // keystroke; the abort signal means a slow earlier response can never overwrite a newer one.
  useEffect(() => {
    const query = value.trim()
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload: SearchSuggestionsResponse = await response.json()
        setSuggestions(payload.suggestions)
        setActiveIndex(-1)
        if (payload.suggestions.length > 0) setOpen(true)
      } catch {
        // Aborted, offline, or the backend is down. The results page reports outages properly;
        // a dropdown is the wrong place to argue about it.
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  const showList = open && suggestions.length > 0
  const seeAllIndex = suggestions.length

  function go(index: number) {
    const suggestion = suggestions[index]
    if (suggestion) {
      setOpen(false)
      router.push(`/articles/${suggestion.slug}`)
      return
    }
    submit()
  }

  function submit() {
    const query = value.trim()
    if (!query) return
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          if (showList && activeIndex >= 0) go(activeIndex)
          else submit()
        }}
      >
        <label htmlFor={id} className="sr-only">
          Search articles
        </label>
        <input
          id={id}
          ref={inputRef}
          type="text"
          name="q"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
          // A click lands after blur, so closing immediately would cancel the selection.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              return
            }
            if (!showList) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((current) => (current >= seeAllIndex ? 0 : current + 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((current) => (current <= -1 ? seeAllIndex : current - 1))
            }
          }}
          placeholder="Search, or ask a question…"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          className={`w-full rounded-full border border-border bg-background text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none ${
            hero ? 'h-12 px-5 pr-12 text-base' : 'h-9 px-3 pr-9 text-sm'
          }`}
        />
        <kbd
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded border border-border font-mono text-muted-foreground ${
            hero ? 'right-4 px-2 py-0.5 text-xs' : 'right-2 px-1.5 py-0.5 text-[10px]'
          }`}
        >
          /
        </kbd>
      </form>

      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-popover text-left shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.slug}>
              <button
                type="button"
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // The input must keep focus so the keyboard stays usable while a pointer hovers.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => go(index)}
                className={`block w-full px-3.5 py-2 text-left ${
                  index === activeIndex ? 'bg-muted' : ''
                }`}
              >
                <span className="block truncate text-sm">{suggestion.title}</span>
                {suggestion.authorName || suggestion.topic ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {[suggestion.topic, suggestion.authorName].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </button>
            </li>
          ))}

          <li>
            <button
              type="button"
              id={`${id}-option-${seeAllIndex}`}
              role="option"
              aria-selected={seeAllIndex === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(seeAllIndex)}
              onClick={submit}
              className={`block w-full border-t border-border px-3.5 py-2 text-left text-xs text-muted-foreground ${
                seeAllIndex === activeIndex ? 'bg-muted' : ''
              }`}
            >
              {/* Always offered: the list above is a shortcut, the results page is the answer. */}
              Search for “{value.trim()}”
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}

/** One request per pause in typing, not one per keystroke. */
const DEBOUNCE_MS = 180

/** Below this, matches are too broad to be worth showing. */
const MIN_QUERY_LENGTH = 2

/**
 * Every mounted search box, so the "/" shortcut has one unambiguous target.
 *
 * The landing page renders two of them. Without this they would both focus themselves and the
 * winner would be whichever effect happened to run last.
 */
const shortcutTargets = new Set<{
  input: React.RefObject<HTMLInputElement | null>
  priority: number
}>()
