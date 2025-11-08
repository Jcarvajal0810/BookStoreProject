// cart-service/grpc/inventoryClient.js

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'proto', 'inventory.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const inventoryProto = grpc.loadPackageDefinition(packageDefinition).inventory;

class InventoryClient {
  constructor() {
    // Si existe variable de entorno, la usa. Si no, usa localhost:50051
    const INVENTORY_GRPC_URL = process.env.INVENTORY_GRPC_URL || 'inventory:50051';


    this.client = new inventoryProto.InventoryService(
      INVENTORY_GRPC_URL,
      grpc.credentials.createInsecure()
    );

    console.log(` Inventory gRPC Client conectado a: ${INVENTORY_GRPC_URL}`);
  }

  checkStock(bookId) {
    return new Promise((resolve, reject) => {
      this.client.CheckStock({ book_id: bookId }, (err, resp) => {
        if (err) return reject(err);
        resolve(resp);
      });
    });
  }

  reserveStock(bookId, quantity) {
    return new Promise((resolve, reject) => {
      this.client.ReserveStock({ book_id: bookId, quantity }, (err, resp) => {
        if (err) return reject(err);
        resolve(resp);
      });
    });
  }

  confirmStock(bookId, quantity) {
    return new Promise((resolve, reject) => {
      this.client.ConfirmStockReduction({ book_id: bookId, quantity }, (err, resp) => {
        if (err) return reject(err);
        resolve(resp);
      });
    });
  }

  releaseStock(bookId, quantity) {
    return new Promise((resolve, reject) => {
      this.client.ReleaseStock({ book_id: bookId, quantity }, (err, resp) => {
        if (err) return reject(err);
        resolve(resp);
      });
    });
  }
}

module.exports = new InventoryClient();
