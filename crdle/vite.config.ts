import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // necesario para GitHub Pages (usa el nombre exacto del repo en minúsculas)
  base: '/crdle/',
  plugins: [react()],
})
