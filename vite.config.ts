import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'WaveWorklet',
      fileName: 'wave-worklet',
      formats: ['umd', 'es'],
    },
    outDir: 'dist',
  },
})
