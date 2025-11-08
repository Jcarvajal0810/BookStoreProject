import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3500,
    hmr: {
      protocol: 'ws',
      host: '54.224.117.4:30995/',
      port: 3500
    },
    allowedHosts : ['.localhost', 
      '54.224.117.4:30995/',
    'all']
  }
})