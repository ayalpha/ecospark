import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import dotenv from 'dotenv';

// Dev-only middleware that runs the real serverless handlers from api/ so
// local development uses the exact same backend code as Vercel production.
function vercelDevApi() {
  dotenv.config();
  return {
    name: 'vercel-dev-api',
    configureServer(server) {
      const wrap = (handler) => (req, res, next) => {
        // Vercel functions receive (req, res) with query pre-parsed and a
        // pre-parsed JSON body, and they use Express-style response helpers —
        // shim those onto connect's raw Node request/response.
        const url = new URL(req.url, 'http://localhost');
        req.query = Object.fromEntries(url.searchParams);
        if (!res.status) res.status = (code) => { res.statusCode = code; return res; };
        if (!res.json) res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };
        const run = () => Promise.resolve(handler(req, res)).catch((err) => {
          console.error('[dev-api]', err);
          if (!res.headersSent) res.status(500).json({ error: err.message });
        });
        if (req.method === 'POST' && req.body === undefined) {
          let raw = '';
          req.on('data', (c) => { raw += c; });
          req.on('end', () => {
            try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
            run();
          });
        } else {
          run();
        }
      };
      server.middlewares.use('/api/news', wrap(async (req, res) => {
        const handler = (await import('./api/news.js')).default;
        return handler(req, res);
      }));
      server.middlewares.use('/api/article', wrap(async (req, res) => {
        const handler = (await import('./api/article.js')).default;
        return handler(req, res);
      }));
      server.middlewares.use('/api/oracle-tick', wrap(async (req, res) => {
        const handler = (await import('./api/oracle-tick.js')).default;
        return handler(req, res);
      }));
      server.middlewares.use('/api/follow', wrap(async (req, res) => {
        const handler = (await import('./api/follow.js')).default;
        return handler(req, res);
      }));
      server.middlewares.use('/api/username', wrap(async (req, res) => {
        const handler = (await import('./api/username.js')).default;
        return handler(req, res);
      }));
    },
  };
}

export default defineConfig({
  plugins: [vercelDevApi(), tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/three') || id.includes('@react-three')) {
            return 'three-vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'motion-vendor';
          }
          if (id.includes('node_modules/firebase/auth')) {
            return 'firebase-auth';
          }
          if (id.includes('node_modules/firebase/firestore')) {
            return 'firebase-firestore';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase-core';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three'],
  },
});
