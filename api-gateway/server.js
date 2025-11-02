require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // Para logs HTTP
const app = express();

//  Configuración CORS completa para permitir el frontend
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

//  Middlewares globales
app.use(express.json());
app.use(morgan('dev')); // Registra todas las peticiones en consola

//  Importar rutas de microservicios
app.use('/users', require('./routes/userRoutes'));
app.use('/catalog', require('./routes/catalogRoutes'));
app.use('/cart', require('./routes/cartRoutes'));
app.use('/order', require('./routes/orderRoutes'));
app.use('/payment', require('./routes/paymentRoutes'));
app.use('/inventory', require('./routes/inventoryRoutes'));

//  Ruta base (verifica que el Gateway está corriendo)
app.get('/', (req, res) => {
  res.send(' API Gateway corriendo correctamente');
});

//  Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada en el API Gateway' });
});

//  Manejador de errores generales (cualquier fallo interno)
app.use((err, req, res, next) => {
  console.error(' Error interno del servidor:', err.stack);
  res.status(500).json({ error: 'Error interno en el API Gateway' });
});

//  Iniciar servidor
const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
  console.log(` API Gateway corriendo en http://localhost:${PORT}`);
});
