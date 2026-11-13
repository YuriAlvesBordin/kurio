import { setupWorker } from 'msw/browser'
import type { EditionId, ScenarioId } from '@/api/contracts'
import { db, initDb, persist, resetDb } from './db'
import { resumePendingOrders, settleOrder } from './domain'
import { handlers } from './handlers'
import { broadcast, dropConnections, peerCount, publishNftUpdated, realtimeHandlers, setConnectionsBlocked } from './realtime'
import { SCENARIOS } from './scenarios'
import { current, listScenarioIds, setManualSettlement, setScenario } from './runtime'

export interface KurioMockControls {
  scenarios: readonly ScenarioId[]
  setScenario: (id: ScenarioId) => ScenarioId
  getScenario: () => ScenarioId
  reset: () => Promise<void>
  updateNft: (id: string, patch: { priceEth?: string; available?: Partial<Record<EditionId, number>> }) => void
  replayLastEvent: () => boolean
  emitStaleNftEvent: (id: string) => void
  settleOrder: (id: string, outcome: 'confirmed' | 'rejected') => void
  setManualSettlement: (value: boolean) => void
  dropConnections: () => void
  blockConnections: (value: boolean) => void
  expireSessions: () => void
  peerCount: () => number
}

declare global {
  interface Window {
    __kurioMock?: KurioMockControls
  }
}

let lastEvent: Parameters<typeof broadcast>[0] | null = null

/**
 * Starts the MSW worker, loads the persistent database and exposes the control surface used by tests and demos.
 */
export async function startMocks(): Promise<void> {
  await initDb()
  resumePendingOrders()
  const worker = setupWorker(...handlers, ...realtimeHandlers)
  worker.events.on('unhandledException', () => undefined)
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true, serviceWorker: { url: '/mockServiceWorker.js' } })

  window.__kurioMock = {
    scenarios: listScenarioIds(),
    setScenario: (id) => setScenario(id).id,
    getScenario: () => current().scenario.id,
    reset: async () => {
      await resetDb()
      setScenario(SCENARIOS.default.id)
    },
    updateNft: (id, patch) => {
      const nft = db().nfts[id]
      if (!nft) return
      if (patch.priceEth) nft.priceEth = patch.priceEth
      for (const edition of nft.editions) {
        const value = patch.available?.[edition.id]
        if (value !== undefined) edition.available = Math.max(0, Math.min(edition.supply, value))
      }
      lastEvent = publishNftUpdated(nft)
    },
    replayLastEvent: () => {
      if (!lastEvent) return false
      broadcast(lastEvent)
      return true
    },
    emitStaleNftEvent: (id) => {
      const nft = db().nfts[id]
      if (!nft) return
      broadcast({
        eventId: `evt-stale-${Date.now()}`,
        type: 'nft.updated',
        resource: { type: 'nft', id },
        version: Math.max(0, nft.version - 5),
        occurredAt: new Date(Date.now() - 60000).toISOString(),
        payload: {
          priceEth: '99',
          compareAtPriceEth: null,
          editions: nft.editions.map((edition) => ({ id: edition.id, available: 0 })),
        },
      })
    },
    settleOrder: (id, outcome) => {
      settleOrder(id, outcome)
    },
    setManualSettlement,
    dropConnections,
    blockConnections: setConnectionsBlocked,
    expireSessions: () => {
      for (const token of Object.values(db().tokens)) token.expired = true
      persist()
    },
    peerCount,
  }
}
