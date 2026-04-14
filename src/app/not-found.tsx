import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg-base px-6 text-center">
      <p className="text-8xl font-bold text-text-primary">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-text-primary">Page not found</h1>
        <p className="max-w-sm text-sm text-text-secondary">
          We can&apos;t find the page you&apos;re looking for. It may have been removed or the link
          might be broken.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-text-primary px-8 py-3 text-sm font-bold text-bg-base transition-opacity hover:opacity-90 active:opacity-75"
      >
        Back to home
      </Link>
    </div>
  )
}
