import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import flowbiteReact from 'flowbite-react/plugin/vite';

export default defineConfig({
  // PrimeThink serves app files below a chat-specific base path.
  base: './',
  plugins: [react(), tailwindcss(), flowbiteReact()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // PrimeThink's uploader deploys top-level files only.
    assetsDir: '.',
    rollupOptions: {
      output: {
        entryFileNames: 'app-[hash].js',
        chunkFileNames: 'chunk-[hash].js',
        assetFileNames: '[name]-[hash][extname]'
      }
    }
  }
});
