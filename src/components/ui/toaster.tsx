import { Toaster as Sonner } from 'sonner'

/**
 * Global toast outlet styled with the design tokens.
 */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      toastOptions={{ style: { background: '#2f1d15', border: '1px solid #55321f', color: '#f5f1eb', fontFamily: 'inherit', borderRadius: 0 } }}
    />
  )
}
