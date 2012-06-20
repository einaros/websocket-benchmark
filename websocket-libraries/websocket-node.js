var WebSocket = require('websocket')
  , WebSocketServer = WebSocket.server
  , http = require('http')
  , server
  , wss
  , ws
  , client;

module.exports = {
  // Server
  createServer: function(port, cb) {
    server = http.createServer();
    wss = new WebSocketServer({
        maxReceivedFrameSize: 0x40000000,
        maxReceivedMessageSize: 0x40000000,
        fragmentOutgoingMessages: false,
        httpServer: server,
        autoAcceptConnections: false
    });
    wss.on('request', function(request) {
      var connection = request.accept(null, request.origin);
      connection.on('message', function(message) {
        if (message.type === 'utf8') {
          connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
          connection.sendBytes(message.binaryData);
        }
      });
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
    ws = new WebSocket.client({
      maxReceivedFrameSize: 0x40000000, // 1GiB max frame size
      maxReceivedMessageSize: 0x40000000, // 1GiB max message size
      fragmentOutgoingMessages: false
    });
    ws.connect('ws://localhost:' + serverport);
    ws.on('connect', function(c) {
      client = c;
      c.on('message', onMessage);
      onConnect();
    });
  },
  sendToServer: function(data, binary) {
    if (binary) client.sendBytes(data);
    else client.sendUTF(data);
  },
  closeClient: function() {
    if (client) client.close();
    client = null;
    ws = null;
  }
};
