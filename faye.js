var WebSocket = require('faye-websocket')
  , http = require('http')
  , server
  , wss
  , ws;

module.exports = {
  // Server
  createServer: function(port, cb) {
    var server = http.createServer();
    server.addListener('upgrade', function(request, socket, head) {
      wss = new WebSocket(request, socket, head);
      wss.onmessage = function(event) {
        wss.send(event.data);
      };
      wss.onclose = function(event) {};
    });
    server.listen(port, '127.0.0.1', cb);
  },
  closeServer: function() {
    if (wss) wss.close();
    wss = null;
    if (server) server.close();
    server = null;
  },
  
  // Client
  createClient: function(serverport, onConnect, onMessage) {
    ws = new WebSocket.Client('ws://localhost:' + serverport + '/');
    ws.onerror = function(e) {
      console.error(e);
      process.exit();
    };
    ws.onopen = onConnect;
    ws.onmessage = onMessage;
  },
  sendToServer: function(data, binary) {
    ws.send(data);
  },
  closeClient: function() {
    if (ws) ws.close();
    ws = null;
  }
};
