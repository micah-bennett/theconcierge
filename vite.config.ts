import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load Vite env files from ./env (see env/*.example)
  envDir: 'env',
})
