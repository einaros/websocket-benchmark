`npm install`

`node benchmark.js --help`

`node benchmark.js -l websocket-libraries/ws -o ws.results`

`node benchmark.js -l websocket-libraries/websocket-node -o websocket-node.results`

`node benchmark.js -l websocket-libraries/faye-websocket-node -o faye-websocket-node.results`

`node compare.js ws.results websocket-node.results`
