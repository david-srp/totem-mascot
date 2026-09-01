import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// 构建产物直接落到 ../public：app.html 覆盖 /app 路由，assets/ 放 JS/CSS。
// publicDir 指回 ../public 是为了 dev 时能拿到 tokens.css / 字体 / showcase 图，
// 但绝不能在 build 时把整个 public 复制进自己（copyPublicDir: false）。
export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(here, '../public'),
  build: {
    outDir: path.resolve(here, '../public'),
    emptyOutDir: false,
    copyPublicDir: false,
    rollupOptions: { input: path.resolve(here, 'app.html') },
  },
  server: {
    port: 5173,
    open: '/app.html',
    // /api 由 scripts/dev-logo-server.mjs 提供，先把它跑起来（npm run dev:api）
    proxy: { '/api': 'http://127.0.0.1:5290' },
  },
})
