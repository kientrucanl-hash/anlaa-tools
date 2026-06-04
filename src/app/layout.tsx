import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SocketProvider } from '@/components/providers/SocketProvider'
import { ToastProvider } from '@/components/ui/Toast'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'ANLAA Estimate — App dự toán thay G8',
  description: 'App dự toán chi phí thi công, bóc khối lượng, so sánh NTP và quản lý đơn giá cho ANLAA.',
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
