import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//  Ruta correcta al .proto
const PROTO_PATH = path.join(__dirname, "order.proto");

// Cargar definición del proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

//  Implementación del servicio gRPC
const orderService = {
  CreateOrder: (call, callback) => {
    const { user_id, items, total_amount } = call.request;

    console.log(" Creando orden para usuario:", user_id);
    console.log(" Items:", items);
    console.log(" Total:", total_amount);

    // Simular creación de orden
    const response = {
      order_id: "ORD-" + Date.now(),
      status: "CREATED",
      message: "Orden creada exitosamente ",
    };

    callback(null, response);
  },
};

//  Crear y arrancar servidor
const server = new grpc.Server();
server.addService(orderProto.OrderService.service, orderService);

const PORT = 50056;
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
