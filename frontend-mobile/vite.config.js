import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../'), '');
  const port = parseInt(env.PORT_MOBILE || '5503', 10);

  return {
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
      port: port,
      host: '0.0.0.0',
      strictPort: true
    },
    preview: {
      port: port,
      host: '0.0.0.0',
      strictPort: true
    }
  };
});
