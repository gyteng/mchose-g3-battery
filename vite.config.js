import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'copy-headers',
      closeBundle() {
        // 复制 headers 配置到 dist/_headers
        const headers = fs.readFileSync('headers.config', 'utf-8')
        fs.writeFileSync('dist/_headers', headers)
      }
    }
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true
  }
})
