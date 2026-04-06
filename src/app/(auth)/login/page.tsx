import { LoginForm } from '@/components/auth/LoginForm'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-lg bg-bg-elevated p-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-text-primary">
        Log in to StreamWave
      </h1>

      <OAuthButtons action="continue" callbackUrl="/" />

      <div className="relative my-6">
        <div className="border-t border-border-default" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-elevated px-2 text-xs text-text-subdued">
          or
        </span>
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-text-subdued">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-text-primary underline hover:text-accent-primary">
          Sign up
        </Link>
      </p>
    </div>
  )
}
