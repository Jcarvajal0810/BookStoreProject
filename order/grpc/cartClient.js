import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, 'cart.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const cartProto = grpc.loadPackageDefinition(packageDefinition).cart;

class CartClient {
  constructor() {
    const CART_GRPC_URL = process.env.CART_GRPC_URL || 'localhost:50053';
    this.client = new cartProto.CartService(
      CART_GRPC_URL,
      grpc.credentials.createInsecure()
    );
    console.log(`🔌 CartClient conectado a ${CART_GRPC_URL}`);
  }

  /**
   * Obtener items del carrito
   */
  getCartItems(userId) {
    return new Promise((resolve, reject) => {
      this.client.GetCartItems({ user_id: userId }, (err, response) => {
        if (err) {
          console.error('[CartClient]  Error en GetCartItems:', err.message);
          return reject(err);
        }
        console.log(`[CartClient]  GetCartItems: ${response.items.length} items`);
        resolve(response);
      });
    });
  }

  /**
   * Vaciar carrito después de orden exitosa
   */
  clearCart(userId) {
    return new Promise((resolve, reject) => {
      this.client.ClearCart({ user_id: userId }, (err, response) => {
        if (err) {
          console.error('[CartClient]  Error en ClearCart:', err.message);
          return reject(err);
        }
        console.log(`[CartClient]  ClearCart: ${response.message}`);
        resolve(response);
      });
    });
  }
}

export default CartClient;