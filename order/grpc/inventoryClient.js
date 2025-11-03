const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Ruta al proto
const PROTO_PATH = path.join(__dirname, 'inventory.proto');

// Carga del proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const inventoryProto = grpc.loadPackageDefinition(packageDefinition).inventory;

// Detectar si estamos dentro de Docker
const isDocker = process.env.IN_DOCKER === 'true';
const host = isDocker ? 'inventory-grpc:50051' : 'localhost:50051';

// Cliente gRPC
const client = new inventoryProto.InventoryService(host, grpc.credentials.createInsecure());

class InventoryClient {
  async checkStock(bookId) {
    return new Promise((resolve, reject) => {
      client.CheckStock({ book_id: bookId }, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  async reserveStock(bookId, quantity) {
    return new Promise((resolve, reject) => {
      client.ReserveStock({ book_id: bookId, quantity }, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  async confirmStock(bookId, quantity) {
    return new Promise((resolve, reject) => {
      client.ConfirmStockReduction({ book_id: bookId, quantity }, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }
}

module.exports = InventoryClient;
