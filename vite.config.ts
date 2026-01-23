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
    // Use esbuild for pre-bundling (fast)
    esbuildOptions: {
      target: 'esnext',
    },
  },
  
  // Build optimizations
  build: {
    // Use esbuild minifier (fastest)
    minify: 'esbuild',
    
    // Optimize chunk sizes
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'icon-vendor': ['lucide-react'],
          'utils-vendor': ['axios', 'date-fns', 'clsx', 'socket.io-client'],
        },
      },
    },
    
    // Target modern browsers for better performance
    target: 'esnext',
    
    // Disable source maps in production for smaller builds
    sourcemap: false,
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Optimize dependencies
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  
  server: {
    port: 3000,
    
    // Enable strict port (fail if port is in use)
    strictPort: false,
    
    // Enable HMR (Hot Module Replacement)
    hmr: {
      overlay: true,
    },
    
    // Open browser automatically
    open: true,
    
    // Enable CORS
    cors: true,
    
    proxy: {
      '/api': {
        target: 'http://localhost:5001',  // ← Changed to 5001
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:5001',    // ← Changed to 5001
        ws: true,
        changeOrigin: true,
      }
    },
    
    // File system watching
    watch: {
      // Ignore node_modules for better performance
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  
  // CSS optimization
  css: {
    devSourcemap: false,
  },
  
  // Enable JSON imports
  json: {
    namedExports: true,
    stringify: false,
  },
  
  // Performance optimizations
  esbuild: {
    // Drop console and debugger in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Use latest JavaScript features
    target: 'esnext',
  },
})