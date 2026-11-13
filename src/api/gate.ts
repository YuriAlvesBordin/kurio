let release: () => void = () => undefined

export const networkGate: Promise<void> = new Promise((resolve) => {
  release = resolve
})

/**
 * Lets pending and future requests proceed. Called once the network layer (the MSW worker when mocks are on) is ready.
 */
export function openNetworkGate(): void {
  release()
}
