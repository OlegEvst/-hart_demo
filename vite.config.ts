import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Используем esbuild вместо terser (быстрее и встроен в Vite)
    cssCodeSplit: true, // Разделяем CSS на отдельные файлы
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Убеждаемся, что пути к ресурсам корректны
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
  base: process.env.VITE_ADMIN_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/admin/' : '/'),
  // Убеждаемся, что все пути корректны
  publicDir: 'public',
})
