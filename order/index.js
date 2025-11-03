require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const InventoryClient = require('./grpc/inventoryClient'); // Cliente gRPC Inventory
const { processPayment } = require('./grpc/paymentClient'); // Cliente gRPC Payment

const app = express();
app.use(express.json());

// ====== CONFIGURACIÓN DE VARIABLES ======
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: Falta la variable MONGO_URI en el entorno.');
  process.exit(1);
}

// ====== CONEXIÓN A MONGODB ======
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Conectado a MongoDB Atlas - Order Service'))
  .catch((err) => {
    console.error('Error conectando a MongoDB Atlas:', err.message);
    process.exit(1);
  });

// ====== CONSTANTES Y MODELO DE ORDEN ======
const VALID_STATUSES = ['CREATED', 'PAID', 'SHIPPED', 'DELIVERED'];

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    book_id: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: 'CREATED',
    },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'orders' }
);

const Order = mongoose.model('Order', orderSchema);

// ====== INSTANCIAR CLIENTE INVENTORY ======
const inventoryClient = new InventoryClient();

// ====== ENDPOINTS ======

// Obtener todas las órdenes
app.get('/api/orders', async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

// Obtener una orden por ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(order);
  } catch {
    res.status(400).json({ message: 'ID inválido' });
  }
});

// Obtener órdenes por usuario
app.get('/api/orders/user/:userId', async (req, res) => {
  const orders = await Order.find({ userId: req.params.userId });
  res.json(orders);
});

// Crear nueva orden con verificación y reserva de stock vía gRPC
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, book_id, quantity, price } = req.body;

    if (!userId || !book_id || !quantity || !price) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    //  Consultar stock disponible en Inventory gRPC
    const stockResp = await inventoryClient.checkStock(book_id);
    if (!stockResp.in_stock || stockResp.available_units < quantity) {
      return res.status(400).json({ message: 'Stock insuficiente' });
    }

    //  Reservar stock temporal
    const reserveResp = await inventoryClient.reserveStock(book_id, quantity);
    if (!reserveResp.success) {
      return res.status(400).json({ message: reserveResp.message });
    }

    //  Crear la orden en MongoDB
    const total = quantity * price;
    const newOrder = new Order({ userId, book_id, quantity, price, total });
    const savedOrder = await newOrder.save();

    //  Procesar pago vía Payment Service gRPC
    const paymentResp = await processPayment(
      savedOrder._id.toString(),
      savedOrder.userId,
      savedOrder.total,
      "card" // método de pago ejemplo
    );

    if (!paymentResp.success) {
      // Pago fallido → revertir la orden y stock
      await Order.findByIdAndDelete(savedOrder._id);
      // Podrías agregar CancelStock si lo tenés en Inventory gRPC
      return res.status(400).json({ message: 'Pago fallido: ' + paymentResp.message });
    }

    console.log('Pago exitoso, transaction_id:', paymentResp.transaction_id);

    //  Confirmar reducción de stock permanente
    await inventoryClient.confirmStock(book_id, quantity);

    //  Devolver orden al cliente
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

// Actualizar estado de orden
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Estado inválido. Los estados válidos son: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json(updated);
  } catch {
    res.status(400).json({ message: 'ID inválido o error de actualización' });
  }
});

// Eliminar una orden
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Orden no encontrada' });
    res.json({ message: 'Orden eliminada con éxito' });
  } catch {
    res.status(400).json({ message: 'ID inválido' });
  }
});

// ====== INICIAR SERVIDOR ======
app.listen(PORT, () => {
  console.log(`Order Service corriendo en el puerto ${PORT}`);
});
