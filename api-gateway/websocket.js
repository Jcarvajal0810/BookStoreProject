const WebSocket = require('ws');

let wss;
let clients = [];

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('  Cliente WebSocket conectado');
    clients.push(ws);

    ws.on('close', () => {
      clients = clients.filter(c => c !== ws);
      console.log('  Cliente WebSocket desconectado');
    });
  });
}

function broadcastStockUpdate(bookId, newStock) {
  const message = JSON.stringify({
    type: 'STOCK_UPDATE',
    bookId,
    stock: newStock
  });

  clients.forEach(ws => ws.send(message));
  console.log(` Emitido STOCK_UPDATE para libro ${bookId} → ${newStock}`);
}

module.exports = { initWebSocket, broadcastStockUpdate };
