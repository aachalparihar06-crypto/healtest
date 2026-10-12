import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(302, { Location: `http://localhost:5173${req.url}` });
  res.end();
});

server.listen(5174, '0.0.0.0', () => {
  console.log('Redirect server on 5174 -> http://localhost:5173');
});
