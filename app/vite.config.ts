import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js is ~575 kB in its own lazy chunk (src/three/Dumbbell.ts), loaded after first
    // paint; the limit sits just above it so a growing initial bundle still warns.
    chunkSizeWarningLimit: 600,
  },
})
