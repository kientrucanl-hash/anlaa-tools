'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getSocket, disconnectSocket } from '@/lib/socket/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { ServerToClientEvents, ClientToServerEvents } from '@/lib/types/socket'
import type { Socket } from 'socket.io-client'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface SocketContextValue {
  socket: AppSocket | null
  connected: boolean
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false })

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isLoggedIn } = useAuth()
  const socketRef = useRef<AppSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!isLoggedIn() || !token) {
      disconnectSocket()
      socketRef.current = null
      setConnected(false)
      return
    }

    const s = getSocket(token)
    socketRef.current = s

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))

    if (s.connected) setConnected(true)

    return () => {
      s.off('connect')
      s.off('disconnect')
    }
  }, [token, isLoggedIn])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
