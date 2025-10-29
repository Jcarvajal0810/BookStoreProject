require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// ====== CONFIGURACIÓN DE VARIABLES Y VERIFICACIÓN ======
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(' ERROR: Falta la variable MONGO_URI en el entorno.');
  process.exit(1);
}

// ====== CONEXIÓN A MONGODB ATLAS ======
mongoose
  .connect(MONGO_URI)
  .then(() => console.log(' Conectado a MongoDB Atlas - Order Service'))
  .catch((err) => {
    console.error(' Error conectando a MongoDB Atlas:', err.message);
    process.exit(1);
  });

// ====== CONSTANTES Y MODELO DE ORDEN ======

// ====== ESTADOS PERMITIDOS ======
const VALID_STATUSES = ['CREATED', 'PAID', 'SHIPPED', 'DELIVERED'];

// ====== MODELO DE ORDEN ======
const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    book_id: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: VALID_STATUSES, // <-- aquí se restringen los valores
      default: 'CREATED',
    },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'orders' }
);

const Order = mongoose.model('Order', orderSchema);

// ====== ENDPOINTS DE LA API (RUTAS) ======

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

// Crear nueva orden
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, book_id, quantity, price } = req.body;

    // Validación básica
    if (!userId || !book_id || !quantity || !price) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    const total = quantity * price;
    const newOrder = new Order({ userId, book_id, quantity, price, total });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Actualizar estado de orden
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    // Validar que el estado sea permitido
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Estado inválido. Los estados válidos son: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

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
  console.log(` Order service corriendo en el puerto ${PORT}`);
});