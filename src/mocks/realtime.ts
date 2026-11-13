import { ws, type WebSocketHandlerConnection } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftDetail, SocketEvent } from '@/api/contracts'
import { db, nextCounter, persist, type MockOrder } from './db'

type Client = WebSocketHandlerConnection['client']

interface Peer {
  client: Client
  userId: string | null
  emit: (event: string, payload: unknown) => void
}

const peers = new Set<Peer>()
let blocked = false

const ENGINE_OPEN_PACKET = `0${JSON.stringify({ sid: 'blocked', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 })}`

export const realtimeLink = ws.link('*/realtime/')

/**
 * Resolves the user bound to a Socket.IO auth token, or null for guests and expired tokens.
 * @param token bearer token sent in the connect packet
 */
function userFromToken(token: unknown): string | null {
  if (typeof token !== 'string') return null
  const entry = db().tokens[token]
  if (!entry || entry.expired || new Date(entry.expiresAt).getTime() < Date.now()) return null
  return entry.userId
}

/**
 * Reads the auth payload of a Socket.IO CONNECT packet such as 40{"token":"abc"}.
 * @param raw raw engine.io message
 */
function readConnectAuth(raw: string): { token?: string } | null {
  if (!raw.startsWith('40')) return null
  const body = raw.slice(2)
  const start = body.indexOf('{')
  if (start === -1) return {}
  try {
    return JSON.parse(body.slice(start)) as { token?: string }
  } catch {
    return {}
  }
}

export const realtimeHandlers = [
  realtimeLink.addEventListener('connection', (connection) => {
    if (blocked) {
      connection.client.send(ENGINE_OPEN_PACKET)
      connection.client.close(1013, 'Mock connection blocked')
      return
    }
    const io = toSocketIo(connection)
    const peer: Peer = {
      client: connection.client,
      userId: null,
      emit: (event, payload) => io.client.emit(event, payload),
    }
    peers.add(peer)
    connection.client.addEventListener('message', (message) => {
      if (typeof message.data !== 'string') return
      const auth = readConnectAuth(message.data)
      if (auth) peer.userId = userFromToken(auth.token)
    })
    const heartbeat = setInterval(() => {
      try {
        connection.client.send('2')
      } catch {
        clearInterval(heartbeat)
      }
    }, 20000)
    connection.client.addEventListener('close', () => {
      clearInterval(heartbeat)
      peers.delete(peer)
    })
  }),
]

/**
 * Sends a Socket.IO event to every peer allowed to receive it.
 * Order events are delivered only to the owner so private data never crosses users.
 * @param event event envelope
 * @param ownerId user that owns the resource, when the event is private
 */
export function broadcast(event: SocketEvent, ownerId?: string): void {
  for (const peer of peers) {
    if (ownerId && peer.userId !== ownerId) continue
    peer.emit(event.type, event)
  }
}

/**
 * Publishes the current mutable state of an NFT as an nft.updated event with a bumped version.
 * @param nft NFT already mutated by the caller
 */
export function publishNftUpdated(nft: NftDetail): SocketEvent {
  nft.version += 1
  const event: SocketEvent = {
    eventId: `evt-${nextCounter('event')}`,
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    payload: {
      priceEth: nft.priceEth,
      compareAtPriceEth: nft.compareAtPriceEth,
      editions: nft.editions.map((edition) => ({ id: edition.id, available: edition.available })),
    },
  }
  persist()
  broadcast(event)
  return event
}

/**
 * Publishes an order state change only to the owner of the order.
 * @param order order already mutated by the caller
 */
export function publishOrderUpdated(order: MockOrder): SocketEvent {
  const event: SocketEvent = {
    eventId: `evt-${nextCounter('event')}`,
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    payload: {
      status: order.status,
      txHash: order.txHash,
      rejectionReason: order.rejectionReason,
      updatedAt: order.updatedAt,
    },
  }
  persist()
  broadcast(event, order.userId)
  return event
}

/**
 * Closes every open socket to simulate a dropped connection. Clients reconnect automatically.
 */
export function dropConnections(): void {
  for (const peer of [...peers]) peer.client.close(1006, 'Mock connection dropped')
}

/**
 * Blocks or unblocks new socket connections so tests can hold the client in the reconnecting state.
 * @param value true to refuse new connections
 */
export function setConnectionsBlocked(value: boolean): void {
  blocked = value
  if (value) dropConnections()
}

/**
 * Counts the currently connected peers.
 */
export function peerCount(): number {
  return peers.size
}
