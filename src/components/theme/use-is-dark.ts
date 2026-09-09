'use client'

import { useEffect, useState } from 'react'

/**
 * Whether the dark theme is currently active.
 *
 * Reads the `.dark` class the theme script puts on `<html>`, and watches it, so it reflects the
 * header toggle as well as the operating system preference. Needed only where a colour cannot be
 * expressed as a CSS custom property — the React Flow canvas draws some of its chrome through
 * inline styles and JS-provided colours, and those cannot inherit a token.
 *
 * Starts false so server and client agree on the first render; the effect corrects it immediately.
 * Anything that would flash visibly should use a CSS token instead.
 */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const read = () => setDark(root.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return dark
}
