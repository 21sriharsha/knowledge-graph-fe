import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-2 text-muted-foreground">
        There is nothing at this address. It may have been renamed, or never written.
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link href="/articles" className="underline underline-offset-4">Browse all articles</Link>
        </li>
        <li>
          <Link href="/topics" className="underline underline-offset-4">Browse by topic</Link>
        </li>
        <li>
          <Link href="/search" className="underline underline-offset-4">Search</Link>
        </li>
      </ul>
    </div>
  )
}
