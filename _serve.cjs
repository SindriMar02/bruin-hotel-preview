// static server for bruin-grindavik (ROOT = this file's dir, per ledger #114a)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname;
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.webp':'image/webp', '.png':'image/png', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.mp4':'video/mp4', '.webm':'video/webm' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(5321, () => console.log('bruin on http://localhost:5321'));
