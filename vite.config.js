import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api calls to the local Express server during development
    // Run `node server.js` in a separate terminal alongside `npm run dev`
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
