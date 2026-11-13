type ToastOptions = Parameters<(typeof import('sonner'))['toast']['success']>[1]

/**
 * Lazy facade over sonner. The library is fetched on the first toast, which keeps it out of the initial bundle.
 */
function show(kind: 'success' | 'error' | 'info', message: string, options?: ToastOptions): void {
  void import('sonner').then(({ toast }) => {
    toast[kind](message, options)
  })
}

export const toast = {
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
}
