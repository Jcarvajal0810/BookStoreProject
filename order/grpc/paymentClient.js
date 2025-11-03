const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Ruta al proto de Payment
const PROTO_PATH = path.join(__dirname, "payment.proto");

// Cargar proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment;

// Crear cliente
const client = new paymentProto.PaymentService(
  "localhost:50052",
  grpc.credentials.createInsecure()
);

// Función para procesar pago
function processPayment(orderId, userId, amount, paymentMethod) {
  return new Promise((resolve, reject) => {
    client.ProcessPayment(
      { order_id: orderId, user_id: userId, amount, payment_method: paymentMethod },
      (err, response) => {
        if (err) return reject(err);
        resolve(response);
      }
    );
  });
}

module.exports = { processPayment };
