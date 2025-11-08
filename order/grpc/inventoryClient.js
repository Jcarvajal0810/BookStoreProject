import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, 'inventory.proto');

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
    const INVENTORY_GRPC_URL = process.env.INVENTORY_GRPC_URL || 'inventory-grpc:50051';

    this.client = new inventoryProto.InventoryService(
      INVENTORY_GRPC_URL,
      grpc.credentials.createInsecure()
    );
    console.log(` InventoryClient conectado a ${INVENTORY_GRPC_URL}`);
  }

  checkStock(bookId) {
    return new Promise((resolve, reject) => {
      this.client.CheckStock({ book_id: bookId }, (err, response) => {
        if (err) {
          console.error('[InventoryClient]  Error en CheckStock:', err.message);
          return reject(err);
        }
        console.log(`[InventoryClient]  CheckStock: ${bookId} - ${response.available_units} unidades`);
        resolve(response);
      });
    });
  }

  reserveStock(bookId, quantity) {
    return new Promise((resolve, reject) => {
      this.client.ReserveStock({ book_id: bookId, quantity }, (err, response) => {
        if (err) {
          console.error('[InventoryClient]  Error en ReserveStock:', err.message);
          return reject(err);
        }
        console.log(`[InventoryClient]  ReserveStock: ${bookId} - ${quantity} unidades`);
        resolve(response);
      });
    });
  }

  confirmStock(bookId, quantity) {
    return new Promise((resolve, reject) => {
      this.client.ConfirmStockReduction({ book_id: bookId, quantity }, (err, response) => {
        if (err) {
          console.error('[InventoryClient]  Error en ConfirmStock:', err.message);
          return reject(err);
        }
        console.log(`[InventoryClient]  ConfirmStock: ${bookId} - ${quantity} unidades`);
        resolve(response);
      });
    });
  }

  //  NUEVO: Liberar stock cuando el pago falla
  releaseStock(bookId, quantity) {
    return new Promise((resolve, reject) => {
      this.client.ReleaseStock({ book_id: bookId, quantity }, (err, response) => {
        if (err) {
          console.error('[InventoryClient]  Error en ReleaseStock:', err.message);
          return reject(err);
        }
        console.log(`[InventoryClient]  ReleaseStock: ${bookId} - ${quantity} unidades liberadas`);
        resolve(response);
      });
    });
  }
}

export default InventoryClient;