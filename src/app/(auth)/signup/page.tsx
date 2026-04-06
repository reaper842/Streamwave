import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { SignupForm } from '@/components/auth/SignupForm'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm rounded-lg bg-bg-elevated p-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-text-primary">
        Sign up for StreamWave
      </h1>

      <OAuthButtons action="signup" callbackUrl="/" />

      <div className="relative my-6">
        <div className="border-t border-border-default" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-elevated px-2 text-xs text-text-subdued">
          or
        </span>
      </div>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-text-subdued">
        Already have an account?{' '}
        <Link href="/login" className="text-text-primary underline hover:text-accent-primary">
          Log in
        </Link>
      </p>
    </div>
  )
}
