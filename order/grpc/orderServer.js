import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, "order.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

//  CONECTAR A MONGODB (igual que en index.js)
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log(' Order gRPC conectado a MongoDB'))
  .catch(err => {
    console.error(' Error conectando a MongoDB:', err);
    process.exit(1);
  });

//  IMPORTAR EL MODELO
const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [{
    book_id: String,
    title: String,
    quantity: Number,
    price: Number
  }],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['CREATED', 'PAID', 'SHIPPED', 'DELIVERED'],
    default: 'CREATED',
  },
  payment_transaction_id: String,
  created_at: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);

//  IMPLEMENTACIÓN REAL DEL SERVICIO
const orderService = {
  CreateOrder: async (call, callback) => {
    const { user_id, items, total_amount } = call.request;

    console.log(" [gRPC] Creando orden para usuario:", user_id);
    console.log(" Items:", items);
    console.log(" Total:", total_amount);

    try {
      // Crear orden en MongoDB
      const newOrder = new Order({
        userId: user_id,
        items: items.map(item => ({
          book_id: item.book_id,
          quantity: item.quantity,
          price: 0, // Podrías obtener el precio desde Catalog
          title: 'N/A'
        })),
        total: total_amount,
        status: 'CREATED'
      });

      const savedOrder = await newOrder.save();

      const response = {
        order_id: savedOrder._id.toString(),
        status: "CREATED",
        message: " Orden creada exitosamente vía gRPC",
      };

      console.log(" [gRPC] Orden creada:", response.order_id);
      callback(null, response);

    } catch (err) {
      console.error(" [gRPC] Error creando orden:", err);
      callback({
        code: grpc.status.INTERNAL,
        message: err.message
      });
    }
  },
};

//  CREAR Y ARRANCAR SERVIDOR
const server = new grpc.Server();
server.addService(orderProto.OrderService.service, orderService);

const PORT = process.env.GRPC_PORT || 50056;
server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(" Error al iniciar servidor gRPC:", err);
      return;
    }
    console.log(` Order gRPC server escuchando en puerto ${port}`);
  }
);