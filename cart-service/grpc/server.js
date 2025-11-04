const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// ====== IMPORTAR MODELO EXISTENTE ======
const Cart = require('../src/models/cart');

// ====== CARGAR PROTO ======
const PROTO_PATH = path.join(__dirname, 'proto', 'cart.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const cartProto = grpc.loadPackageDefinition(packageDefinition).cart;

// ====== MÉTODOS gRPC ======

/**
 * ClearCart - Vacía el carrito (llamado por OrderService después de pago)
 */
async function clearCart(call, callback) {
  try {
    const { user_id } = call.request;
    console.log(`[gRPC Cart] ClearCart solicitado para user_id: ${user_id}`);

    const result = await Cart.findOneAndUpdate(
      { user_id: user_id },
      { items: [], updated_at: new Date() },
      { new: true, upsert: false }
    );

    if (!result) {
      return callback(null, {
        success: false,
        message: `Carrito no encontrado para user_id: ${user_id}`
      });
    }

    console.log(`[gRPC Cart]  Carrito vaciado para user_id: ${user_id}`);
    callback(null, {
      success: true,
      message: 'Carrito vaciado exitosamente'
    });

  } catch (error) {
    console.error('[gRPC Cart]  Error en ClearCart:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

/**
 * GetCartItems - Obtiene items del carrito (llamado por OrderService)
 */
async function getCartItems(call, callback) {
  try {
    const { user_id } = call.request;
    console.log(`[gRPC Cart] GetCartItems solicitado para user_id: ${user_id}`);

    const cart = await Cart.findOne({ user_id: user_id });

    if (!cart || cart.items.length === 0) {
      console.log(`[gRPC Cart] Carrito vacío para user_id: ${user_id}`);
      return callback(null, {
        items: [],
        total: 0
      });
    }

    const total = cart.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    const response = {
      items: cart.items.map(item => ({
        book_id: item.book_id,
        title: item.title || 'Sin título',
        quantity: item.quantity,
        price: item.price
      })),
      total: total
    };

    console.log(`[gRPC Cart]  Devolviendo ${cart.items.length} items, total: $${total}`);
    callback(null, response);

  } catch (error) {
    console.error('[gRPC Cart]  Error en GetCartItems:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
}

// ====== INICIAR SERVIDOR gRPC ======
function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(cartProto.CartService.service, {
    ClearCart: clearCart,
    GetCartItems: getCartItems
  });

  const GRPC_PORT = process.env.GRPC_PORT || '50053';
  const address = `0.0.0.0:${GRPC_PORT}`;

  server.bindAsync(
    address,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error(' Error iniciando servidor gRPC CartService:', err);
        process.exit(1);
      }
      console.log(` Servidor gRPC CartService escuchando en puerto ${port}`);
    }
  );
}

module.exports = { startGrpcServer };