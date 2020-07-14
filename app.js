var http = require('http'); // node 내장 모듈 불러옴

//var hostname = '127.0.0.1'; // localhost와 동일
var port = process.env.PORT || 3000;

http.createServer(function(req, res){
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World123푸쉬테스트\n');
}).listen(port);

console.log('Server running at http://:'+port);