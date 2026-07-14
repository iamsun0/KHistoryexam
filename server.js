// 로컬 정적 서버 (웹앱 미리보기용). 사용: node server.js [port]
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "src");
const PORT = parseInt(process.argv[2] || "8777", 10);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log("serving src/ at http://localhost:" + PORT));
