// DEV-001: serve only the public game assets, with module/JSON MIME types.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/src/app.mjs', ['src/app.mjs', 'text/javascript']],
  ['/src/render.mjs', ['src/render.mjs', 'text/javascript']],
  ['/src/game-engine.mjs', ['src/game-engine.mjs', 'text/javascript']],
  ['/data/levels.v0.2.json', ['data/levels.v0.2.json', 'application/json']],
]);
const port = Number(process.env.PORT || 5173);
const server = http.createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const asset = assets.get(new URL(req.url, 'http://localhost').pathname);
  if (!asset) { res.writeHead(404); res.end('Not Found'); return; }
  try {
    const body = await readFile(new URL('../' + asset[0], import.meta.url));
    res.writeHead(200, {'content-type':asset[1]+'; charset=utf-8', 'cache-control':'no-store'});
    res.end(body);
  } catch {
    res.writeHead(500); res.end('Unable to load game asset');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Direction Echo: http://127.0.0.1:${port}`));
