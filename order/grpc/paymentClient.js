import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, 'payment.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment;

export function processPayment(orderId, userId, amount, paymentMethod) {
  return new Promise((resolve, reject) => {
    const PAYMENT_GRPC_URL = process.env.PAYMENT_GRPC_URL || 'localhost:50052';
    const client = new paymentProto.PaymentService(
      PAYMENT_GRPC_URL,
      grpc.credentials.createInsecure()
    );

    console.log(`[PaymentClient]  Procesando pago para orden ${orderId}`);

    client.ProcessPayment(
      { 
        order_id: orderId, 
        user_id: userId, 
        amount, 
        payment_method: paymentMethod 
      },
      (err, response) => {
        if (err) {
          console.error('[PaymentClient]  Error al procesar pago:', err.message);
          return reject(err);
        }
        console.log(`[PaymentClient]  Pago procesado: ${response.transaction_id}`);
        resolve(response);
      }
    );
  });
}