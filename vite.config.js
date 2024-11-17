import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts', // 라이브러리 진입점
      name: 'WaveWorklet', // 라이브러리 글로벌 이름
      fileName: format => `wave-worklet.${format}.js`,
    },
  },
})
