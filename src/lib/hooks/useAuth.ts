'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AuthUser {
  id: number
  username: string
  role: 'USER' | 'ADMIN'
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  isAdmin: () => boolean
  isLoggedIn: () => boolean
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      isAdmin: () => get().user?.role === 'ADMIN',
      isLoggedIn: () => get().token !== null && get().user !== null,
    }),
    {
      name: 'anlaa-auth',
      storage: createJSONStorage(() => {
        // Use cookie-compatible storage for Next.js middleware access
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return {
          getItem(name) {
            const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
            return match ? decodeURIComponent(match[2]!) : null
          },
          setItem(name, value) {
            document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${8 * 3600}; SameSite=Lax`
            // Also store token separately for middleware
            try {
              const parsed = JSON.parse(value) as { state?: { token?: string } }
              if (parsed.state?.token) {
                document.cookie = `anlaa_token=${encodeURIComponent(parsed.state.token)}; path=/; max-age=${8 * 3600}; SameSite=Lax`
              }
            } catch {}
          },
          removeItem(name) {
            document.cookie = `${name}=; path=/; max-age=0`
            document.cookie = `anlaa_token=; path=/; max-age=0`
          },
        }
      }),
    }
  )
)
