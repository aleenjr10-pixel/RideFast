import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@rideshare/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'process.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(''),
      'process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(''),
    },
  };
});
