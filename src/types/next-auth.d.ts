import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      displayName: string
      avatarUrl: string | null
    } & DefaultSession['user']
  }

  interface User {
    displayName?: string
    avatarUrl?: string | null
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string
    displayName?: string
    avatarUrl?: string | null
  }
}
