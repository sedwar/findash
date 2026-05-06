import { defineConfig } from 'vite';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Dev-only middleware: lets the running app POST its current state to
// /__save_state and have it written straight into public/state.json on disk.
// In production builds this plugin doesn't run, so the export button falls
// back to a browser download.
export default defineConfig({
  plugins: [
    {
      name: 'state-saver',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/__save_state', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const target = resolve(here, 'public/state.json');
              writeFileSync(target, body);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, path: target }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
        });
      },
    },
  ],
});
