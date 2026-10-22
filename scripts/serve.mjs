import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../index.html', import.meta.url);
const port = Number(process.env.PORT || 5173);
const html = await readFile(root);
const server = http.createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/index.html') {
    res.writeHead(404, {'content-type':'text/plain; charset=utf-8'});
    res.end('Not Found'); return;
  }
  res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(html);
});
server.listen(port, '127.0.0.1', () => console.log(`Direction Echo baseline: http://127.0.0.1:${port}`));
