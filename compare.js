var fs = require('fs')
  , util = require('util');
require('./lib/shared');

if (process.argv.length < 4) {
  console.error('usage: compare <result file 1> <result file 2>');
  process.exit(-1);
}
var fileA = process.argv[2];
var resA = JSON.parse(fs.readFileSync(fileA));
var fileB = process.argv[3];
var resB = JSON.parse(fs.readFileSync(fileB));

var keys = Object.keys(resA);
for (var i = 0, l = keys.length; i < l; ++i) {
  var key = keys[i];
  var rA = resA[key];
  var rB = resB[key];
  var aIsFaster = rA.speed > rB.speed;
  var desc = util.format('Roundtrips of %s %s data: %s %d%% faster', humanSize(rA.size), rA.binary ? 'binary' : 'text', aIsFaster ? fileA : fileB, Math.round((aIsFaster ? (rA.speed / rB.speed) : (rB.speed / rA.speed)) * 100) - 100);
  console.log(desc);
}
