import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Build output directory
    minify: 'terser', // Enable minification, can also use 'esbuild'
    rollupOptions: {
      // Additional Rollup options can be configured here
      output: {
        // Custom output options
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash][ext]',
      },
    },
  },
});