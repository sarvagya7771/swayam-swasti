import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The customer app is a static single-page bundle. It talks to Supabase
// directly from the browser using the public anon key + Row Level Security.
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 3000 },
  preview: { host: '0.0.0.0', port: 3000 },
  build: { outDir: 'dist', sourcemap: false },
});
