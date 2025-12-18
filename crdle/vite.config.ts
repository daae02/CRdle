import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // necesario para GitHub Pages (ajusta al nombre exacto del repo en GH, respetando mayúsculas)
  base: '/CRdle/',
  plugins: [react()],
})
