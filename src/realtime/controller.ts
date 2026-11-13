import type { Socket } from 'socket.io-client'
import { networkGate } from '@/api/gate'
import type { QueryClient } from '@tanstack/react-query'
import { socketEventSchema, type NftList, type NftDetail, type Order, type SocketEvent } from '@/api/contracts'
import { keys } from '@/api/keys'
import { setRealtimeStatus } from './status'

const SEEN_LIMIT = 500

/**
 * Applies validated socket events to the query cache with duplicate and stale event protection.
 * A single controller owns one socket for one identity and fully cleans up on stop.
 */
export class RealtimeController {
  private socket: Socket | null = null
  private readonly seenEvents: string[] = []
  private readonly seenSet = new Set<string>()
  private readonly versions = new Map<string, number>()
  private hasConnected = false
  private stopped = false

  constructor(
    private readonly client: QueryClient,
    private readonly identity: { userId: string | null; token: string | null },
  ) {}

  /**
   * Opens the websocket and subscribes to events.
   */
  start(): void {
    setRealtimeStatus('connecting')
    void networkGate.then(() => import('socket.io-client')).then(({ io }) => {
      if (!this.stopped) this.open(io)
    })
  }

  /**
   * Creates the socket with the given factory and registers every listener.
   * @param io the socket.io-client connection factory loaded on demand
   */
  private open(io: typeof import('socket.io-client').io): void {
    const socket = io('/', {
      path: '/realtime/',
      transports: ['websocket'],
      auth: this.identity.token ? { token: this.identity.token } : {},
      reconnection: true,
      timeout: 3000,
      reconnectionDelay: 300,
      reconnectionDelayMax: 2000,
    })
    this.socket = socket

    socket.on('connect', () => {
      setRealtimeStatus('connected')
      if (this.hasConnected) this.reconcile()
      this.hasConnected = true
    })
    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return
      setRealtimeStatus('reconnecting')
      if (reason === 'io server disconnect') socket.connect()
    })
    socket.on('connect_error', () => {
      setRealtimeStatus('reconnecting')
      if (!socket.active) socket.connect()
    })
    socket.io.on('reconnect_attempt', () => setRealtimeStatus('reconnecting'))
    socket.on('nft.updated', (raw: unknown) => this.handle(raw))
    socket.on('order.updated', (raw: unknown) => this.handle(raw))
  }

  /**
   * Removes every listener and closes the socket so nothing outlives the identity that owned it.
   */
  stop(): void {
    this.stopped = true
    const socket = this.socket
    this.socket = null
    if (!socket) return
    socket.removeAllListeners()
    socket.io.removeAllListeners()
    socket.disconnect()
    setRealtimeStatus('idle')
  }

  /**
   * Refetches active data after a reconnection because events may have been missed while offline.
   */
  private reconcile(): void {
    void this.client.invalidateQueries({ queryKey: keys.catalogRoot })
    void this.client.invalidateQueries({ queryKey: keys.nftRoot })
    void this.client.invalidateQueries({ queryKey: keys.cartRoot })
    void this.client.invalidateQueries({ queryKey: keys.privateRoot })
  }

  /**
   * Remembers an event id and reports whether it was already processed.
   * @param eventId stable event identity
   */
  private isDuplicate(eventId: string): boolean {
    if (this.seenSet.has(eventId)) return true
    this.seenSet.add(eventId)
    this.seenEvents.push(eventId)
    if (this.seenEvents.length > SEEN_LIMIT) {
      const oldest = this.seenEvents.shift()
      if (oldest) this.seenSet.delete(oldest)
    }
    return false
  }

  /**
   * Validates, deduplicates and version checks an event before applying it.
   * @param raw payload received from the socket
   */
  private handle(raw: unknown): void {
    const parsed = socketEventSchema.safeParse(raw)
    if (!parsed.success) return
    const event = parsed.data
    if (this.isDuplicate(event.eventId)) return
    const resourceKey = `${event.resource.type}:${event.resource.id}`
    const known = this.versions.get(resourceKey) ?? 0
    if (event.version <= known) return
    this.versions.set(resourceKey, event.version)
    if (event.type === 'nft.updated') this.applyNft(event)
    else this.applyOrder(event)
  }

  /**
   * Merges an nft.updated event into detail and list caches only when it is newer than the cached version.
   * @param event validated event
   */
  private applyNft(event: Extract<SocketEvent, { type: 'nft.updated' }>): void {
    const id = event.resource.id
    this.client.setQueryData<NftDetail>(keys.nft(id), (old) => {
      if (!old || old.version >= event.version) return old
      return {
        ...old,
        priceEth: event.payload.priceEth,
        compareAtPriceEth: event.payload.compareAtPriceEth,
        version: event.version,
        editions: old.editions.map((edition) => ({
          ...edition,
          available: event.payload.editions.find((entry) => entry.id === edition.id)?.available ?? edition.available,
        })),
      }
    })
    this.client.setQueriesData<NftList>({ queryKey: keys.catalogRoot }, (old) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.map((item) =>
          item.id === id && item.version < event.version
            ? { ...item, priceEth: event.payload.priceEth, compareAtPriceEth: event.payload.compareAtPriceEth, version: event.version }
            : item,
        ),
      }
    })
    void this.client.invalidateQueries({ queryKey: keys.cartRoot })
    if (this.identity.userId) void this.client.invalidateQueries({ queryKey: keys.quote(this.identity.userId) })
  }

  /**
   * Merges an order.updated event into the order cache and refreshes dependent data.
   * @param event validated event
   */
  private applyOrder(event: Extract<SocketEvent, { type: 'order.updated' }>): void {
    const userId = this.identity.userId
    if (!userId) return
    this.client.setQueryData<Order>(keys.order(userId, event.resource.id), (old) => {
      if (!old || old.version >= event.version) return old
      return { ...old, ...event.payload, version: event.version }
    })
    void this.client.invalidateQueries({ queryKey: keys.order(userId, event.resource.id) })
    void this.client.invalidateQueries({ queryKey: keys.orders(userId) })
    void this.client.invalidateQueries({ queryKey: keys.cartRoot })
    void this.client.invalidateQueries({ queryKey: keys.quote(userId) })
  }
}
