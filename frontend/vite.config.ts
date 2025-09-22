import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'declarations': path.resolve(__dirname, './src/declarations'),
      '@': path.resolve(__dirname, './src')
    }
  },
  define: {
    'process.env.II_URL': '"https://identity.ic0.app/"',
    'process.env.STORAGE_GATEWAY_URL': '"https://dev-blob.caffeine.ai"',
    'process.env.DFX_NETWORK': '"local"',
    'process.env.CANISTER_ID_CONTEXT_REGISTRY': '"uxrrr-q7777-77774-qaaaq-cai"',
    'global': 'globalThis'
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})