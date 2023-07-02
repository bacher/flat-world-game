// @ts-ignore
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // https://dev.to/tilly/aliasing-in-vite-w-typescript-1lfo
  // https://stackoverflow.com/questions/66043612/vue3-vite-project-alias-src-to-not-working
  resolve: {
    alias: {
      // @ts-ignore
      '@': path.resolve(__dirname, './src'),
    },
  },
});
