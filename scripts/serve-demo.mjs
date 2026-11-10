/** Strict static server: also reproduces project-path hosting without SPA fallbacks. */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, statSync, realpathSync, createReadStream } from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = realpathSync(existsSync(path.join(here, 'index.html')) ? here : path.join(here, '../dist-demo'));
const port = Number(process.env.PORT || 4174);
const base = process.env.DEMO_BASE_PATH || '/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('Invalid DEMO_BASE_PATH');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (base !== '/' && pathname === base.slice(0,-1)) { res.writeHead(301, { Location: base }); res.end(); return; }
    if (!pathname.startsWith(base)) { res.writeHead(404); res.end(); return; }
    const relative = pathname.slice(base.length);
    if (relative.startsWith('__demo_api__') || relative.startsWith('v1/')) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'Mock local indisponivel.' })); return; }
    let target = path.resolve(root, relative || 'index.html');
    if (!target.startsWith(`${root}${path.sep}`)) { res.writeHead(403); res.end(); return; }
    if (!existsSync(target) || statSync(target).isDirectory()) { res.writeHead(404); res.end(); return; }
    target = realpathSync(target);
    if (!target.startsWith(`${root}${path.sep}`)) { res.writeHead(403); res.end(); return; }
    res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'HEAD') res.end(); else createReadStream(target).pipe(res);
  } catch { res.writeHead(400); res.end(); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`CRM Demo: http://127.0.0.1:${port}${base}\nCtrl+C encerra o servidor.`));
