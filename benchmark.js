#!/usr/bin/env node

var cluster = require('cluster')
  , util = require('util')
  , ansi = require('ansi')
  , fs = require('fs');
require('tinycolor');
require('./lib/shared');

var program = require('commander');
program
  .option('-c, --config <type>', 'A benchmark config [config.json]', 'config.json')
  .option('-l, --library <type>', 'A websocket library provider')
  .option('-o, --output <file>', 'Where to dump statistics')
  .option('-d, --details <file>', 'Where to dump detailed statistics')
  .option('-r, --repetitions <num>', 'How many repetitions to run the benchmark for [1]', 1)
  .option('-q, --quiet', 'Supress most console output')
  .parse(process.argv);

if (!program.library) {
  console.error('library required. try --help.');
  process.exit(-1);
}
program.repetitions = parseInt(program.repetitions);

var quiet = program.quiet;
var config = JSON.parse(fs.readFileSync(program.config, 'utf8'));
var target = require('./' + program.library);

if (cluster.isMaster) {
  var repetitions = program.repetitions
    , benchmarkRuns = [];

  function completeSingleRun(data) {
    benchmarkRuns.push(data);
    if(!repeat()) {
      if (!quiet) console.log('Benchmark complete'.green);
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
      if (program.details) fs.writeFileSync(program.verboseoutput, JSON.stringify(benchmarkRuns));
      if (program.output) fs.writeFileSync(program.output, JSON.stringify(totalResults));
      process.exit();
    }
  }

  function repeat() {
    if (repetitions == 0) return false;
    repetitions -= 1;
    console.log('Running benchmark repetition %d of %d'.yellow, program.repetitions - repetitions, program.repetitions);
    target.closeServer();
    target.createServer(8181, function() {
      var child = cluster.fork();
      child.on('message', function(message) {
        if (message.cmd == 'complete') completeSingleRun(message.data);
      });
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

  if (!quiet) console.log('Generating %s of test data ...'.blue.bold, humanSize(largest));
  var randomBytes = generateRandomData(largest);

  function runTestCase(benchmarkCase, cb) {
    var dt
      , counterId
      , roundtrip = 0
      , data = randomBytes.slice(0, benchmarkCase.size);
    if (benchmarkCase.binary == false) data = data.toString('utf8');

    var prefix = util.format('Running %d roundtrips of %s %s data', benchmarkCase.roundtrips, humanSize(benchmarkCase.size), benchmarkCase.binary ? 'binary' : 'text');
    if (!quiet) console.log(prefix);
    
    function send() {
      target.sendToServer(data, benchmarkCase.binary);
    }
    
    function onConnect() {
      counterId = setInterval(function() {
        if (!quiet) cursor.up();
        if (!quiet) console.log('%s:\t%ds ...'
          , prefix
          , ~~((Date.now() - dt) / 1000));
      }, 1000);
      dt = Date.now();
      send();
    }

    function onMessage() {
      if (++roundtrip == benchmarkCase.roundtrips) {
        var elapsed = Date.now() - dt;
        clearInterval(counterId);
        if (!quiet) cursor.up();
        benchmarkCase.speed = (benchmarkCase.size * benchmarkCase.roundtrips) / elapsed * 1000;
        if (!quiet) console.log('%s:\t%ss\t%s'
          , benchmarkCase.binary ? prefix.green : prefix.cyan
          , roundPrec(elapsed / 1000, 1).toString().green.bold
          , (humanSize(benchmarkCase.speed) + '/s').blue.bold);
        results.push(benchmarkCase);
        target.closeClient();
        cb();
        return;
      }
      send();
    }
    
    target.createClient(8181, onConnect, onMessage);
  }

  function runBenchmark() {
    runTestCase(cases.shift(), function() {
      if (cases.length == 0) {
        process.send({cmd: 'complete', data: results});
        process.exit();
      }
      else runBenchmark();
    });
  }

  runBenchmark();
}

