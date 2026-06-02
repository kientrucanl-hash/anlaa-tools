'use client'

import { io, type Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@/lib/types/socket'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

export function getSocket(token: string): AppSocket {
  if (!socket || !socket.connected) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000'
    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    }) as AppSocket
  }
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocketInstance(): AppSocket | null {
  return socket
}
