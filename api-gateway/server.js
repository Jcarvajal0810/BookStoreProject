require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');                         
const { initWebSocket } = require('./websocket');     

const app = express();

//  Configuración CORS completa
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

//  Middlewares globales
app.use(express.json());
app.use(morgan('dev'));

//  Middleware para asegurar respuestas JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

//  Importar rutas de microservicios
app.use('/users', require('./routes/userRoutes'));
app.use('/catalog', require('./routes/catalogRoutes'));
app.use('/cart', require('./routes/cartRoutes'));
app.use('/order', require('./routes/orderRoutes'));
app.use('/payment', require('./routes/paymentRoutes'));
app.use('/inventory', require('./routes/inventoryRoutes'));

//  Ruta base
app.get('/', (req, res) => {
  res.json({ 
    message: ' API Gateway corriendo correctamente',
    services: {
      users: '/users',
      catalog: '/catalog',
      cart: '/cart',
      order: '/order',
      payment: '/payment',
      inventory: '/inventory'
    }
  });
});

//  Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'not found',
    message: 'Ruta no encontrada en el API Gateway',
    path: req.path
  });
});

//  Manejador de errores generales
app.use((err, req, res, next) => {
  console.error('❌ Error interno del servidor:', err.stack);
  res.status(500).json({ 
    error: 'internal error',
    message: 'Error interno en el API Gateway'
  });
});

//  Iniciar servidor HTTP + WebSocket
const PORT = process.env.PORT || 4500;
const HOST = process.env.API_GATEWAY_HOST || '0.0.0.0';
const server = http.createServer(app);       

initWebSocket(server);                      

server.listen(PORT, HOST, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` API Gateway corriendo en http://${HOST}:${PORT}`);
  console.log(` WebSocket activo en ws://${HOST}:${PORT}`);
  console.log(`${'='.repeat(60)}\n`);
});
