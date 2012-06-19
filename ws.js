var cluster = require('cluster')
  , WebSocket = require('ws')
  , WebSocketServer = WebSocket.Server
  , util = require('util')
  , ansi = require('ansi')
  , fs = require('fs');
require('tinycolor');
require('./lib/shared');

var silent = process.argv[2] == '--silent';
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

if (cluster.isMaster) {
  var repetitions = config.repetitions;

  var benchmarkRuns = [];
  var wss;
  function repeat() {
    if (repetitions == 0) return false;
    repetitions -= 1;
    if (wss) {
      wss.close();
      wss = null;
    }
    wss = new WebSocketServer({port: 8181}, function() {
      var child = cluster.fork();
      child.on('message', function(message) {
        if (message.cmd == 'complete') {
          benchmarkRuns.push(message.data);
          if(!repeat()) {
            if (!silent) console.log('Benchmark complete');
            var totalResults = {};
            for (var i = 0; i < benchmarkRuns.length; ++i) {
              var benchmarkRun = benchmarkRuns[i];
              for (var k = 0; k < benchmarkRun.length; ++k) {
                var result = benchmarkRun[k]; 
                if (typeof totalResults[k] == 'undefined') totalResults[k] = result;
                else totalResults[k].speed += result.speed;
              }
            }
            var keys = Object.keys(totalResults);
            for (var i = 0; i < keys.length; ++i) {
              totalResults[keys[i]].speed = totalResults[keys[i]].speed / benchmarkRuns.length;
            }
            console.log(JSON.stringify(totalResults));
            process.exit();
          }
        }
      });
    });
    wss.on('connection', function(ws) {
      ws.on('message', function(data, flags) {
        ws.send(data, {binary: flags&&flags.binary});
      });
      ws.on('close', function() {});
    });
    return true;
  }
  
  repeat();
}
else {
  var cursor = ansi(process.stdout);
  var cases = config.cases;
  var results = [];
  var largest = cases[0].size;
  for (var i = 0, l = cases.length; i < l; ++i) {
    if (cases[i].size > largest) largest = cases[i].size;
  }

  if (!silent) console.log('Generating %s of test data ...', humanSize(largest));
  var randomBytes = generateRandomData(largest);

  function roundtrip(benchmarkCase, cb) {
    var data = randomBytes.slice(0, benchmarkCase.size);
    if (benchmarkCase.binary == false) data = data.toString('utf8');
    var prefix = util.format('Running %d roundtrips of %s %s data', benchmarkCase.roundtrips, humanSize(benchmarkCase.size), benchmarkCase.binary ? 'binary' : 'text');
    if (!silent) console.log(prefix);
    var ws = new WebSocket('ws://localhost:' + '8181');
    var dt;
    var counterId;
    var roundtrip = 0;
    function send() {
      ws.send(data, {binary: benchmarkCase.binary});
    }
    ws.on('error', function(e) {
      console.error(e);
      process.exit();
    });
    ws.on('open', function() {
      counterId = setInterval(function() {
        if (!silent) cursor.up();
        if (!silent) console.log('%s:\t%ds ...'
          , prefix
          , ~~((Date.now() - dt) / 1000));
      }, 1000);
      dt = Date.now();
      send();
    });
    ws.on('message', function(data, flags) {
      if (++roundtrip == benchmarkCase.roundtrips) {
        var elapsed = Date.now() - dt;
        clearInterval(counterId);
        if (!silent) cursor.up();
        benchmarkCase.speed = (benchmarkCase.size * benchmarkCase.roundtrips) / elapsed * 1000;
        if (!silent) console.log('%s:\t%ss\t%s'
          , benchmarkCase.binary ? prefix.green : prefix.cyan
          , roundPrec(elapsed / 1000, 1).toString().green.bold
          , (humanSize(benchmarkCase.speed) + '/s').blue.bold);

        results.push(benchmarkCase);
        ws.close();
        cb();
        return;
      }
      process.nextTick(send);
    });
  }

  function runBenchmark() {
    if (cases.length == 0) {
      process.send({cmd: 'complete', data: results});
      process.exit();
    }
    roundtrip(cases.shift(), runBenchmark);
  }
  runBenchmark();
}

