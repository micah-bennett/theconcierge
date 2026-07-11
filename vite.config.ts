import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Absolute base so the web deployment (Vercel) can deep-link into nested
  // routes (e.g. /hop/login). The Capacitor iOS build overrides this back to
  // './' via `npm run cap:sync` (relative paths are required for its
  // bundled local assets).
})
