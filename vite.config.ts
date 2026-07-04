import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Libera qualquer subdomínio do tunnel Cloudflare (o host rotaciona a cada execução)
    allowedHosts: ['.trycloudflare.com'],
  },
})
