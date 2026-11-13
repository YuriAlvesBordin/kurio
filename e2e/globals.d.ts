interface KurioMockControls {
  setScenario: (id: string) => string
  reset: () => Promise<void>
  updateNft: (id: string, patch: { priceEth?: string; available?: Record<string, number> }) => void
  replayLastEvent: () => boolean
  emitStaleNftEvent: (id: string) => void
  settleOrder: (id: string, outcome: 'confirmed' | 'rejected') => void
  setManualSettlement: (value: boolean) => void
  dropConnections: () => void
  blockConnections: (value: boolean) => void
  expireSessions: () => void
  peerCount: () => number
}

interface Window {
  __kurioMock?: KurioMockControls
}
