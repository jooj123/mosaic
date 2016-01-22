// Simulates a mosaic server.
//
// /             serves mosaic.html
// /js/*         servers static files
// /color/<hex>  generates a tile for the color <hex>, and caches it in memory.
//
var mosaic = require('./js/mosaic.js');
var gm = require('gm');
var fs = require('fs');
var http = require('http');
var url = require('url');
var path = require('path');

var dir = path.dirname(fs.realpathSync(__filename));
var mimeTypes = {
  'html': 'text/html',
  'js'  : 'application/javascript'
};
var cache = {};

http.createServer(function (req, res) {
  var pathname = url.parse(req.url).pathname;
  var m;
  if (pathname == '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    fs.createReadStream(dir + '/mosaic.html').pipe(res);
    return;
  } else if (m = pathname.match(/^\/js\//)) {
    var filename = dir + pathname;
    var stats = fs.existsSync(filename) && fs.statSync(filename);
    if (stats && stats.isFile()) {
      res.writeHead(200, {'Content-Type' : 'application/javascript'});
      fs.createReadStream(filename).pipe(res);
      return;
    }
  } else if (m = pathname.match(/^\/color\/([0-9a-fA-F]{6})/)) {
    var hex = m[1];
    if (hex in cache) {
      complete(cache[hex]);
      return;
    } else {
      var gw = gm(mosaic.TILE_WIDTH, mosaic.TILE_HEIGHT, '#ffffff00')
        .fill('#' + hex)
        .stroke('white', 0)
        .drawEllipse(mosaic.TILE_WIDTH / 2 - 0.5, mosaic.TILE_HEIGHT / 2 - 0.5, mosaic.TILE_WIDTH / 2 + 0.5, mosaic.TILE_HEIGHT / 2 + 0.5)
        .stream('png');
      var chunks = [];
      gw.on('data', function(chunk) { chunks.push(chunk); });
      gw.on('end', function() {
        var buf = Buffer.concat(chunks);
        cache[hex] = buf;
        complete(buf);
      });
      return;
    }
    function complete(buf) {
      res.writeHead(200, {'Content-Type': 'image/png'});
      res.write(buf);
      res.end();
    }
  }
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.write('404 Not Found\n');
  res.end();
}).listen(8765, 'localhost');

console.log('mosaic server running on port 8765');
