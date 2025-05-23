import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Ensure _redirects file is included in the build
const publicDir = resolve(__dirname, 'public')
const redirectsFile = resolve(publicDir, '_redirects')
if (!fs.existsSync(redirectsFile)) {
  fs.writeFileSync(redirectsFile, '/* /index.html 200')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
      historyApiFallback: true,
    },
    define: {
      'process.env': env
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  }
}) 