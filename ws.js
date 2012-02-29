var cluster = require('cluster')
  , WebSocket = require('ws')
  , WebSocketServer = WebSocket.Server
  , util = require('util')
  , ansi = require('ansi')
  , fs = require('fs');
require('tinycolor');
require('./lib/shared');

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
  var cases = JSON.parse(fs.readFileSync('config.json', 'utf8')).cases;
  var largest = cases[0][1];
  for (var i = 0, l = cases.length; i < l; ++i) {
    if (cases[i][2] > largest) largest = cases[i][2];
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
    var counterId;
    var roundtrip = 0;
    function send() {
      client.send(data, {binary: useBinary});
    }
    client.on('error', function(e) {
      console.error(e);
      process.exit();
    });
    client.on('open', function() {
      counterId = setInterval(function() {
        cursor.up();
        console.log('%s:\t%ds ...'
          , prefix
          , ~~((Date.now() - dt) / 1000));
      }, 1000);
      dt = Date.now();
      send();
    });
    client.on('message', function(data, flags) {
      if (++roundtrip == roundtrips) {
        var elapsed = Date.now() - dt;
        clearInterval(counterId);
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
    if (cases.length == 0) process.exit();
    var config = cases.shift();
    config.push(run);
    roundtrip.apply(null, config);
  })();
}