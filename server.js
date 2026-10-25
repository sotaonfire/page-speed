// デモ用のローカルサーバー（依存なし）
// Speculation Rules は http(s) でしか動かないため、file:// ではなくこのサーバーで開く
//   node server.js → http://localhost:3000/
//
// ファイルをそのまま返すだけで、人工的な遅延は入れていない（重さはファイルそのものの重さ）

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
};

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const filePath = path.join(ROOT, pathname === "/" ? "index.html" : decodeURIComponent(pathname));

  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end("Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream",
    });
    res.end(data);
  });

  console.log(`${req.method} ${pathname}`);
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}/`);
});
