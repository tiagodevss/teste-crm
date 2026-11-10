import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from 'tailwindcss';

const root = path.resolve(__dirname);
const workerSource = () => readFileSync(path.join(root, 'public/mockServiceWorker.js'), 'utf8');
const policy = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "font-src 'self'", "connect-src 'self'",
  "worker-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "form-action 'none'",
].join('; ');

function demoEntry(): Plugin {
  let development = false;
  return {
    name: 'accounting-isolated-demo-entry',
    configResolved(config) { development = config.command === 'serve'; },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${development ? policy.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'") : policy}">`);
      },
    },
    configureServer(server) {
      server.middlewares.use(`${server.config.base}mockServiceWorker.js`, (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-store');
        res.end(workerSource());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'mockServiceWorker.js', source: workerSource() });
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nDisallow: /\n' });
    },
  };
}

export default defineConfig({
  mode: 'demo',
  plugins: [react(), demoEntry()],
  publicDir: false,
  envDir: false,
  define: { 'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true') },
  resolve: { alias: [{ find: '@', replacement: root }] },
  css: {
    postcss: {
      plugins: [tailwindcss({
        content: ['./demo/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './modules/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}'],
        theme: { extend: {
          fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'] },
          colors: { salesforce: { blue: '#0176d3', hover: '#005fb8', light: '#f3f4f6', border: '#e5e7eb', text: '#181b21' } },
          animation: { 'fade-in': 'fadeIn 0.2s ease-out forwards' },
          keyframes: { fadeIn: { '0%': { opacity: '0.7' }, '100%': { opacity: '1' } } },
        } },
      })],
    },
  },
  build: { outDir: 'dist-demo', emptyOutDir: true, target: 'es2022', sourcemap: false },
  server: { host: '127.0.0.1', port: 4174, strictPort: true, hmr: false },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
});
