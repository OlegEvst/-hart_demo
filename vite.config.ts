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
      // Убеждаемся, что все данные включены в сборку (не tree-shaken)
      treeshake: {
        moduleSideEffects: (id) => {
          // Включаем все файлы данных в сборку
          if (id.includes('/src/data/') && id.endsWith('.ts')) {
            return true;
          }
          return false;
        }
      }
    },
  },
  base: process.env.VITE_ADMIN_BASE_PATH || '/',
  // Убеждаемся, что все пути корректны
  publicDir: 'public',
  // Оптимизация зависимостей
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-google-charts']
  }
})
