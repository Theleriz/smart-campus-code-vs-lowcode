import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { explainApiPlugin } from './server/vitePlugin';
import { createLlmGenerator } from './server/llmGenerator';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Server-only secrets: loaded here (Node), never exposed to the client bundle (no VITE_ prefix).
  const env = { ...loadEnv(mode, process.cwd(), 'LLM_'), ...process.env };
  return {
    plugins: [react(), explainApiPlugin({ generate: createLlmGenerator(env) })],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
