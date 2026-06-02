import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SocketProvider } from '@/components/providers/SocketProvider'
import { ToastProvider } from '@/components/ui/Toast'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'MECALC — Công cụ Tính Vật tư Xây dựng',
  description: 'Tool tính vật tư xây dựng miền Bắc: gạch, xi măng, cát, keo dán, gạch ốp lát',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          themes={['dark', 'light', 'hc']}
        >
          <QueryProvider>
            <SocketProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </SocketProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
