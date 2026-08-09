import { io, type Socket } from "socket.io-client"
import { getChatUrl } from "./api"
import type { Division } from "./api"

export interface ChatSocketEvents {
  "message:new": (payload: { division: Division; message: Record<string, unknown> }) => void
  "message:read": (payload: { division: Division; conversationId: string }) => void
  "message:updated": (payload: { division: Division; message: Record<string, unknown> }) => void
  "message:deleted": (payload: { division: Division; messageId: string }) => void
  "presence:update": (payload: { division: Division; customerId?: string | null; sessionId?: string | null; lastSeen: string }) => void
  typing: (payload: { division: Division; conversationId: string; sender: string; isTyping: boolean }) => void
  error: (payload: { message: string }) => void
}

/**
 * Connect to the realtime chat service as a customer. Uses the customer JWT
 * (localStorage) when authenticated, or the anonymous sessionId.
 */
export function connectChatSocket(options: {
  division: Division
  token?: string | null
  sessionId?: string
  onEvent: <K extends keyof ChatSocketEvents>(event: K, cb: ChatSocketEvents[K]) => void
}): Socket | null {
  const { division, token, sessionId, onEvent } = options
  if (!division) return null

  const socket = io(getChatUrl(), {
    transports: ["websocket", "polling"],
    auth: {
      division,
      ...(token ? { token } : {}),
      ...(!token && sessionId ? { sessionId } : {}),
    },
  })

  ;(Object.keys({
    "message:new": 1,
    "message:read": 1,
    "message:updated": 1,
    "message:deleted": 1,
    "presence:update": 1,
    typing: 1,
    error: 1,
  }) as Array<keyof ChatSocketEvents>).forEach((event) => {
    socket.on(event, ((payload: unknown) => {
      onEvent(event, payload as never)
    }) as never)
  })

  return socket
}
