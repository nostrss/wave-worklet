import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  build: {
    outDir: 'dist', // Library output folder
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'WaveWorklet',
      fileName: format => `wave-worklet.${format}.js`,
      formats: ['umd', 'es'],
    },
  },
})
