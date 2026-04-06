import { PlaybackBar } from '@/components/layout/PlaybackBar'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { ToastProvider } from '@/components/ui/Toast'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StreamWave',
  description: 'Music streaming platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="h-full bg-bg-base text-text-secondary antialiased">
        <SessionProvider>
          <ToastProvider>
            {children}
            <PlaybackBar />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
