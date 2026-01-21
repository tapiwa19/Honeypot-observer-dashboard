import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Pre-bundle dependencies for faster dev server startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'recharts',
      'axios',
      'socket.io-client',
      'date-fns',
      'clsx'
    ],
    // Force re-optimization on dependency changes
    force: false,
  },
  
  // Build optimizations
  build: {
    // Use faster minifier
    minify: 'esbuild',
    // Optimize chunk sizes
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'icon-vendor': ['lucide-react'],
        },
      },
    },
    // Speed up builds
    target: 'esnext',
    // Source maps for debugging (set to false for production)
    sourcemap: false,
  },
  
  server: {
    port: 3000,
    // Enable HMR (Hot Module Replacement)
    hmr: {
      overlay: true,
    },
    // Open browser automatically
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true,
      }
    }
  },
  
  // CSS optimization
  css: {
    devSourcemap: false,
  },
})