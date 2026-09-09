/**
 * Applies the theme class before the first paint.
 *
 * This has to be a blocking inline script in the document head. Deciding the theme in React would
 * mean the browser paints the light theme first and then swaps, which is the flash every
 * dark-mode implementation is judged on — and it is worse on this site than most, because the
 * reading surface is the whole page.
 *
 * Precedence: an explicit choice the reader made, otherwise the operating system.
 */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark'
                      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    /* Private mode can throw on localStorage. Falling through leaves the light theme, which is a
       working page rather than a broken one. */
  }
})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />
}
