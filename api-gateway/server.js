require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

//  Configuración CORS completa para permitir el frontend
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

//  Importar rutas de microservicios
app.use('/users', require('./routes/userRoutes'));
app.use('/catalog', require('./routes/catalogRoutes'));
app.use('/cart', require('./routes/cartRoutes'));
app.use('/order', require('./routes/orderRoutes'));
app.use('/payment', require('./routes/paymentRoutes'));
app.use('/inventory', require('./routes/inventoryRoutes'));

// Iniciar servidor
const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
  console.log(`✅ API Gateway corriendo en http://localhost:${PORT}`);
});
