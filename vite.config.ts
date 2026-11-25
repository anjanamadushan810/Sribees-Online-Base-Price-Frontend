/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The API is served under /api on the same origin (Caddy in production, this proxy
// in development), so the refresh cookie is first-party and SameSite=Strict works.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Only React is pinned: antd modules fall into the chunk of the first page that needs
        // them, so a page's antd code is not downloaded until that page is opened.
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
    // antd alone is ~1.3 MB (400 kB gzipped) and is cached after the first visit.
    chunkSizeWarningLimit: 1400,
  },
  server: {
    port: 5182,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8102',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
