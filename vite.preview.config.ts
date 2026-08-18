import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import react from '@vitejs/plugin-react'
import baseConfig from './vite.config'

// Builds the entire app into ONE self-contained dist-preview/index.html
// (JS + CSS inlined) so it can be opened without any server — handy for a
// quick visual smoke test of the real app before wiring up Supabase.
// Production deployments use `npm run build` (vite.config.ts) instead.
export default defineConfig({
  ...baseConfig,
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-preview',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
