import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import InventoryClient from './grpc/inventoryClient.js';
import { processPayment } from './grpc/paymentClient.js';
import CartClient from './grpc/cartClient.js';

const app = express();
app.use(express.json());

// ====== CONFIGURACIÓN ======
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: Falta MONGO_URI en .env');
  process.exit(1);
}

// ====== CONEXIÓN MONGODB ======
mongoose
  .connect(MONGO_URI)
  .then(() => console.log(' Conectado a MongoDB - Order Service'))
  .catch((err) => {
    console.error(' Error conectando a MongoDB:', err.message);
    process.exit(1);
  });

// ====== MODELO DE ORDEN ======
const VALID_STATUSES = ['CREATED', 'PAID', 'SHIPPED', 'DELIVERED', 'PAYMENT_FAILED'];

const orderSchema = new mongoose.Schema(
  {
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
      enum: VALID_STATUSES,
      default: 'CREATED',
    },
    payment_transaction_id: String,
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'orders' }
);

const Order = mongoose.model('Order', orderSchema);

// ====== CLIENTES gRPC ======
const inventoryClient = new InventoryClient();
const cartClient = new CartClient();

// ====== MIDDLEWARE DE LOGS ======
app.use((req, res, next) => {
  console.log(`[Order Service] ${req.method} ${req.path}`);
  next();
});

// ====== ENDPOINTS REST ======

app.get('/api/orders', async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(order);
  } catch {
    res.status(400).json({ message: 'ID inválido' });
  }
});

app.get('/api/orders/user/:userId', async (req, res) => {
  const orders = await Order.find({ userId: req.params.userId });
  res.json(orders);
});

//  NUEVO: Ruta corta /order (redirige a /api/orders/from-cart)
app.post('/order', async (req, res) => {
  console.log('[Order Service] Recibido POST /order, redirigiendo internamente...');
  
  // Redirigir internamente a /api/orders/from-cart
  req.url = '/api/orders/from-cart';
  return app.handle(req, res);
});

// ====== CREAR ORDEN DESDE CARRITO ======
app.post('/api/orders/from-cart', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId es requerido' });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(` INICIANDO FLUJO DE ORDEN PARA userId: ${userId}`);
  console.log('='.repeat(60));

  try {
    // ===== PASO 1: Obtener items del carrito vía gRPC =====
    console.log('\n [1/7] Obteniendo items del carrito (gRPC)...');
    const cartData = await cartClient.getCartItems(userId);

    if (!cartData.items || cartData.items.length === 0) {
      console.log(' Carrito vacío');
      return res.status(400).json({ message: 'El carrito está vacío' });
    }

    console.log(` Carrito obtenido: ${cartData.items.length} items, total: $${cartData.total.toFixed(2)}`);
    cartData.items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.title} - ${item.quantity}x $${item.price}`);
    });

    // ===== PASO 2: Validar stock para cada item =====
    console.log('\n [2/7] Validando stock en Inventory (gRPC)...');
    for (const item of cartData.items) {
      const stockResp = await inventoryClient.checkStock(item.book_id);
      if (!stockResp.in_stock || stockResp.available_units < item.quantity) {
        console.log(` Stock insuficiente para ${item.book_id}`);
        return res.status(400).json({
          message: `Stock insuficiente para libro: ${item.title}`
        });
      }
      console.log(`    ${item.title}: ${stockResp.available_units} disponibles`);
    }
    console.log(' Stock validado para todos los items');

    // ===== PASO 3: Reservar stock =====
    console.log('\n [3/7] Reservando stock temporal (gRPC)...');
    const reservedItems = [];
    try {
      for (const item of cartData.items) {
        const reserveResp = await inventoryClient.reserveStock(item.book_id, item.quantity);
        if (!reserveResp.success) {
          throw new Error(`Fallo al reservar: ${item.title}`);
        }
        reservedItems.push(item.book_id);
        console.log(`   ✓ Reservado: ${item.title} (${item.quantity} unidades)`);
      }
      console.log(' Stock reservado exitosamente');
    } catch (err) {
      console.error(' Error en reserva de stock:', err.message);
      // Revertir reservas parciales
      for (const bookId of reservedItems) {
        try {
          await inventoryClient.releaseStock(bookId, 1);
        } catch (releaseErr) {
          console.error(`Error liberando stock de ${bookId}:`, releaseErr.message);
        }
      }
      return res.status(400).json({ message: err.message });
    }

    // ===== PASO 4: Crear orden en MongoDB =====
    console.log('\n [4/7] Creando orden en base de datos...');
    const newOrder = new Order({
      userId,
      items: cartData.items.map(item => ({
        book_id: item.book_id,
        title: item.title,
        quantity: item.quantity,
        price: item.price
      })),
      total: cartData.total,
      status: 'CREATED'
    });
    const savedOrder = await newOrder.save();
    console.log(` Orden creada con ID: ${savedOrder._id}`);

    // ===== PASO 5: NO procesar pago aún (esperar frontend) =====
    console.log('\n [5/7] Orden creada, esperando pago del frontend...');

    console.log(`\n${'='.repeat(60)}`);
    console.log(` ORDEN CREADA - Esperando pago - ID: ${savedOrder._id}`);
    console.log(`${'='.repeat(60)}\n`);

    // Responder con la orden creada pero SIN payment_transaction_id
    res.status(201).json({
      success: true,
      order_id: savedOrder._id,
      total: savedOrder.total,
      items_count: savedOrder.items.length,
      message: 'Orden creada exitosamente. Por favor procede al pago.'
    });

  } catch (err) {
    console.error('\n ERROR EN FLUJO DE ORDEN:', err);
    res.status(500).json({ message: 'Error procesando orden: ' + err.message });
  }
});

//  Endpoint para recibir resultado del pago desde el frontend
app.post('/api/orders/:orderId/payment-result', async (req, res) => {
  const { orderId } = req.params;
  const { status, transactionId, message } = req.body;

  console.log(`\n Recibido resultado de pago para orden ${orderId}`);
  console.log(`   Status: ${status}`);
  console.log(`   Transaction ID: ${transactionId || 'N/A'}`);

  try {
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    if (status === 'APPROVED') {
      console.log('\n [6/7] Pago aprobado - Confirmando stock...');
      
      // Confirmar reducción de stock
      for (const item of order.items) {
        await inventoryClient.confirmStock(item.book_id, item.quantity);
        console.log(`    Stock confirmado: ${item.title}`);
      }

      // Vaciar carrito
      console.log('\n [7/7] Vaciando carrito...');
      await cartClient.clearCart(order.userId);

      // Actualizar orden
      await Order.findByIdAndUpdate(orderId, {
        status: 'PAID',
        payment_transaction_id: transactionId
      });

      console.log(`\n ORDEN COMPLETADA: ${orderId}\n`);

      return res.json({
        success: true,
        message: 'Pago procesado y orden completada'
      });

    } else if (status === 'REJECTED' || status === 'DECLINED') {
      console.log('\n Pago rechazado - Liberando stock...');
      
      // Liberar stock reservado
      for (const item of order.items) {
        await inventoryClient.releaseStock(item.book_id, item.quantity);
        console.log(`   ↩ Stock liberado: ${item.title} (${item.quantity} unidades)`);
      }

      // Actualizar estado de orden
      await Order.findByIdAndUpdate(orderId, {
        status: 'PAYMENT_FAILED'
      });

      console.log(`\n ORDEN CANCELADA: ${orderId}\n`);

      return res.json({
        success: false,
        message: 'Pago rechazado, stock liberado'
      });

    } else {
      // Estado desconocido o pendiente
      console.log(`\n Pago en estado: ${status}`);
      
      return res.json({
        success: false,
        message: `Pago en estado: ${status}`
      });
    }

  } catch (err) {
    console.error(' Error procesando resultado de pago:', err);
    return res.status(500).json({
      success: false,
      message: 'Error procesando resultado: ' + err.message
    });
  }
});

// ====== ENDPOINT LEGACY: Orden individual =====
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, book_id, quantity, price } = req.body;

    if (!userId || !book_id || !quantity || !price) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const stockResp = await inventoryClient.checkStock(book_id);
    if (!stockResp.in_stock || stockResp.available_units < quantity) {
      return res.status(400).json({ message: 'Stock insuficiente' });
    }

    const reserveResp = await inventoryClient.reserveStock(book_id, quantity);
    if (!reserveResp.success) {
      return res.status(400).json({ message: reserveResp.message });
    }

    const total = quantity * price;
    const newOrder = new Order({
      userId,
      items: [{ book_id, quantity, price, title: 'N/A' }],
      total
    });
    const savedOrder = await newOrder.save();

    const paymentResp = await processPayment(
      savedOrder._id.toString(),
      savedOrder.userId,
      savedOrder.total,
      "card"
    );

    if (!paymentResp.success) {
      await Order.findByIdAndDelete(savedOrder._id);
      return res.status(400).json({ message: 'Pago fallido: ' + paymentResp.message });
    }

    await inventoryClient.confirmStock(book_id, quantity);
    await Order.findByIdAndUpdate(savedOrder._id, { status: 'PAID' });

    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}`
      });
    }
    const updated = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(updated);
  } catch {
    res.status(400).json({ message: 'Error de actualización' });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json({ message: 'Orden eliminada' });
  } catch {
    res.status(400).json({ message: 'ID inválido' });
  }
});

// ====== INICIAR SERVIDOR gRPC (en paralelo al REST) ======
import('./grpc/orderServer.js').catch(err => {
  console.error(' No se pudo iniciar gRPC server:', err.message);
});

// ====== INICIAR SERVIDOR REST ======
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` Order Service iniciado`);
  console.log(`${'='.repeat(60)}`);
  console.log(` REST API: http://localhost:${PORT}`);
  console.log(` gRPC Server: localhost:${process.env.GRPC_PORT || 50056}`);
  console.log(` Inventory gRPC: ${process.env.INVENTORY_GRPC_URL || 'localhost:50051'}`);
  console.log(` Payment gRPC: ${process.env.PAYMENT_GRPC_URL || 'localhost:50052'}`);
  console.log(` Cart gRPC: ${process.env.CART_GRPC_URL || 'localhost:50053'}`);
  console.log(`${'='.repeat(60)}\n`);
});