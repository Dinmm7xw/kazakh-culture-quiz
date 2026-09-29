import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    postcss: {
      plugins: []
    }
  },
  server: {
    port: 5173,
    open: false
  }
});
