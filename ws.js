var WebSocket = require('ws')
  , WebSocketServer = WebSocket.Server
  , wss
  , ws;

module.exports = {
  // Server
  createServer: function(port, cb) {
    wss = new WebSocketServer({port: port}, cb);
    wss.on('connection', function(ws) {
      ws.on('message', function(data, flags) {
        ws.send(data, {binary: flags&&flags.binary});
      });
      ws.on('close', function() {});
    });
  },
  closeServer: function() {
    if (wss) wss.close();
    wss = null;
  },
  
  // Client
  createClient: function(serverport, onConnect, onMessage) {
    ws = new WebSocket('ws://localhost:' + serverport);
    ws.on('error', function(e) {
      console.error(e);
      process.exit();
    });
    ws.on('open', onConnect);
    ws.on('message', onMessage);
  },
  sendToServer: function(data, binary) {
    ws.send(data, {binary: binary});
  },
  closeClient: function() {
    if (ws) ws.close();
    ws = null;
  }
};
