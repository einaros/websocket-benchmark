var cluster = require('cluster')
  , WebSocket = require('ws')
  , WebSocketServer = WebSocket.Server
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
  var wss = new WebSocketServer({port: 8181}, function() {
    cluster.fork();
  });
  wss.on('connection', function(ws) {
    ws.on('message', function(data, flags) {
      ws.send(data, {binary: flags&&flags.binary});
    });
    ws.on('close', function() {});
  });
  cluster.on('death', function(worker) {
    console.log('Client closed');
    wss.close();
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
    var client = new WebSocket('ws://localhost:' + '8181');
    var dt;
    var roundtrip = 0;
    function send() {
      client.send(data, {binary: useBinary});
    }
    client.on('error', function(e) {
      console.error(e);
      process.exit();
    });
    client.on('open', function() {
      dt = Date.now();
      send();
    });
    client.on('message', function(data, flags) {
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
    });
  }

  (function run() {
    if (configs.length == 0) process.exit();
    var config = configs.shift();
    config.push(run);
    roundtrip.apply(null, config);
  })();
}