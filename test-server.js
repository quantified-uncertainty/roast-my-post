const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  if (req.url === '/test-doc') {
    const content = fs.readFileSync(path.join(__dirname, 'test-spelling-doc.md'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(8888, () => {
  console.log('Test server running at http://localhost:8888/test-doc');
});