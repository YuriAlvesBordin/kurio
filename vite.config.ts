import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Adds a modulepreload hint for the lazily loaded mock layer so it downloads in parallel with the entry bundle.
 */
function preloadMocks(): Plugin {
  return {
    name: 'preload-mocks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const chunk = Object.values(context.bundle ?? {}).find((entry) => entry.type === 'chunk' && entry.isDynamicEntry && entry.facadeModuleId?.endsWith('mocks/browser.ts'))
        if (!chunk) return []
        return [{ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `/${chunk.fileName}` }, injectTo: 'head' }]
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadMocks()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          tanstack: ['@tanstack/react-router', '@tanstack/react-query'],
        },
      },
    },
  },
})
