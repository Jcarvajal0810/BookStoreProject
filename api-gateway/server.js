const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas de microservicios
app.use('/users', require('./routes/userRoutes'));
app.use('/catalog', require('./routes/catalogRoutes'));
app.use('/cart', require('./routes/cartRoutes'));
app.use('/order', require('./routes/orderRoutes'));
app.use('/payment', require('./routes/paymentRoutes'));
app.use('/inventory', require('./routes/inventoryRoutes'));

const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
  console.log(`API Gateway corriendo en http://localhost:${PORT}`);
});