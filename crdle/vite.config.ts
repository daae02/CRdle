import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // necesario para GitHub Pages en repo crdle (sirve assets desde /crdle/)
  base: '/crdle/',
  plugins: [react()],
})
