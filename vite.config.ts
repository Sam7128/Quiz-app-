import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/nvidia': {
        target: 'https://integrate.api.nvidia.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nvidia/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild', // 將 'terser' 改為 'esbuild'，或直接刪除這一行
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 將 React 核心與圖表庫、動畫庫打包在一起，確保彼此間的 Context 與 ref 連結不中斷
            if (
              id.includes('react') || 
              id.includes('react-dom') || 
              id.includes('react-is') ||
              id.includes('recharts') ||
              id.includes('framer-motion') ||
              id.includes('react-redux') ||
              id.includes('@reduxjs/toolkit') ||
              id.includes('victory-vendor')
            ) {
              return 'vendor-ui-core';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@supabase') || id.includes('@google') || id.includes('openai')) {
              return 'vendor-api';
            }
          }
        },
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]',
      },
    },
  },
});
