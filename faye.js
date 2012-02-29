var cluster = require('cluster')
  , WebSocket = require('faye-websocket')
  , http = require('http')
  , util = require('util')
  , ansi = require('ansi')
  , fs = require('fs');
require('tinycolor');
require('./lib/shared');

if (cluster.isMaster) {
  var server = http.createServer();
  server.addListener('upgrade', function(request, socket, head) {
    var wss = new WebSocket(request, socket, head);
    wss.onmessage = function(event) {
      wss.send(event.data);
    };
    wss.onclose = function(event) {};
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
    var client = new WebSocket.Client('ws://localhost:' + '8181/');
    var dt;
    var counterId;
    var roundtrip = 0;
    function send() {
      client.send(data);
    }
    client.onopen = function(event) {
      counterId = setInterval(function() {
        cursor.up();
        console.log('%s:\t%ds ...'
          , prefix
          , ~~((Date.now() - dt) / 1000));
      }, 1000);
      dt = Date.now();
      send();
    };
    client.onmessage = function(event) {
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
    };
  }

  (function run() {
    if (cases.length == 0) process.exit();
    var config = cases.shift();
    config.push(run);
    roundtrip.apply(null, config);
  })();
}