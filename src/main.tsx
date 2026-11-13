import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import '@fontsource-variable/roboto-mono'
import './styles/index.css'
import { openNetworkGate } from './api/gate'
import { queryClient } from './api/queryClient'
import { router } from './routes/router'

/**
 * Mounts the application while the MSW layer boots in parallel. Requests and the websocket wait on the network gate.
 */
function main() {
  const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS === 'true'
  const booting = mocksEnabled ? import('./mocks/browser').then(({ startMocks }) => startMocks()) : Promise.resolve()
  void booting.catch(() => undefined).then(openNetworkGate)
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void main()
