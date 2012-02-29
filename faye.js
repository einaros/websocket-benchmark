var cluster = require('cluster')
  , WebSocket = require('faye-websocket')
  , http = require('http')
  , util = require('util')
  , ansi = require('ansi');
require('tinycolor');

function roundPrec(num, prec) {
  var mul = Math.pow(10, prec);
  return Math.round(num * mul) / mul;
}

function humanSize(bytes) {
  if (bytes >= 1048576) return roundPrec(bytes / 1048576, 2) + ' MB';
  if (bytes >= 1024) return roundPrec(bytes / 1024, 2) + ' kB';
  return roundPrec(bytes, 2) + ' B';
}

function generateRandomData(size) {
  var buffer = new Buffer(size);
  for (var i = 0; i < size; ++i) {
    buffer[i] = ~~(Math.random() * 127);
  }
  return buffer;
}

if (cluster.isMaster) {

  var server = http.createServer();
  server.addListener('upgrade', function(request, socket, head) {
    var ws = new WebSocket(request, socket, head);
    ws.onmessage = function(event) {
      ws.send(event.data);
    };
    ws.onclose = function(event) {};
    cluster.on('death', function(worker) {
      console.log('Client closed');
      process.exit();
    });
  });
  server.listen(8181, '127.0.0.1', function() {
    cluster.fork();
  });
}
else {
  var cursor = ansi(process.stdout);

  var configs = [
    [true, 20000, 64],
    [true, 10000, 16*1024],
    [true, 2000, 128*1024],
    [true, 200, 1024*1024],
    [true, 1, 500*1024*1024],
    [false, 20000, 64],
    [false, 10000, 16*1024],
    [false, 2000, 128*1024],
    [false, 200, 1024*1024],
  ];

  var largest = configs[0][1];
  for (var i = 0, l = configs.length; i < l; ++i) {
    if (configs[i][2] > largest) largest = configs[i][2];
  }

  console.log('Generating %s of test data ...', humanSize(largest));
  var randomBytes = generateRandomData(largest);

  function roundtrip(useBinary, roundtrips, size, cb) {
    var data = randomBytes.slice(0, size);
    if (useBinary == false) data = data.toString('utf8');
    var prefix = util.format('Running %d roundtrips of %s %s data', roundtrips, humanSize(size), useBinary ? 'binary' : 'text');
    console.log(prefix);
    var client = new WebSocket.Client('ws://localhost:' + '8181/');
    var dt;
    var roundtrip = 0;
    function send() {
      client.send(data);
    }
    client.onopen = function(event) {
      dt = Date.now();
      send();
    };
    client.onmessage = function(event) {
      if (++roundtrip == roundtrips) {
        var elapsed = Date.now() - dt;
        cursor.up();
        console.log('%s:\t%ss\t%s'
          , useBinary ? prefix.green : prefix.cyan
          , roundPrec(elapsed / 1000, 1).toString().green.bold
          , (humanSize((size * roundtrips) / elapsed * 1000) + '/s').blue.bold);
        client.close();
        cb();
        return;
      }
      process.nextTick(send);
    };
  }

  (function run() {
    if (configs.length == 0) process.exit();
    var config = configs.shift();
    config.push(run);
    roundtrip.apply(null, config);
  })();
}