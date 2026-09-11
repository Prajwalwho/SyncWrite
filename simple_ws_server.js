const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  console.log('Simple WS Server: Client connected');

  ws.on('message', message => {
    console.log(`Simple WS Server: Received: ${message}`);
    ws.send(`Simple WS Server: Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('Simple WS Server: Client disconnected');
  });

  ws.on('error', error => {
    console.error('Simple WS Server: WebSocket error:', error);
  });
});

wss.on('listening', () => {
  console.log('Simple WS Server: Listening on port 8080');
});

wss.on('error', error => {
  console.error('Simple WS Server: Server error:', error);
});
