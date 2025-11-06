const express = require('express');
const axios = require('axios');
const router = express.Router();

const ORDER_URL = process.env.ORDER_SERVICE_URL || 'http://order:4000';

//  LOGS PARA DEBUGGING
router.use((req, res, next) => {
  console.log(`[Order Gateway] ${req.method} ${req.path} - Body:`, req.body);
  next();
});

// 🔥 RUTA 1: POST /order (sin /api/orders) - Crear orden desde carrito
router.post('/', async (req, res) => {
  try {
    console.log('[Order Gateway] Redirigiendo POST / a /api/orders/from-cart');
    
    if (!req.body.userId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'userId es requerido' 
      });
    }

    const url = `${ORDER_URL}/api/orders/from-cart`;
    const response = await axios.post(url, req.body, {
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      timeout: 30000 // 30 segundos
    });

    console.log('[Order Gateway] Orden creada exitosamente:', response.data);
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('[Order Gateway] Error en POST /:', error.response?.data || error.message);
    
    const status = error.response?.status || 500;
    const data = error.response?.data || { 
      error: "Error creando orden", 
      details: error.message 
    };
    
    res.status(status).json(data);
  }
});

//  RUTA 2: GET /order/ (vacío) - Informar uso correcto
router.get('/', async (req, res) => {
  res.status(400).json({ 
    error: 'Bad Request', 
    message: 'Usa POST /order con {userId} para crear orden, o GET /api/orders para listar todas'
  });
});

//  RUTA 3: POST /from-cart - Alias directo
router.post('/from-cart', async (req, res) => {
  try {
    const url = `${ORDER_URL}/api/orders/from-cart`;
    const response = await axios.post(url, req.body, {
      headers: req.headers,
      timeout: 30000
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: "Error en order service" };
    console.error('[Order Gateway] Error en /from-cart:', data);
    res.status(status).json(data);
  }
});

//  RUTA 4: GET /user/:userId - Órdenes de un usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const url = `${ORDER_URL}/api/orders/user/${req.params.userId}`;
    const response = await axios.get(url, {
      headers: req.headers
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: "Error obteniendo órdenes" };
    res.status(status).json(data);
  }
});

//  RUTA 5: GET /:id - Obtener orden por ID
router.get('/:id', async (req, res) => {
  try {
    const url = `${ORDER_URL}/api/orders/${req.params.id}`;
    const response = await axios.get(url, {
      headers: req.headers
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: "Orden no encontrada" };
    res.status(status).json(data);
  }
});

//  RUTA 6: Proxy genérico para el resto de rutas
router.all('*', async (req, res) => {
  try {
    const url = `${ORDER_URL}/api/orders${req.path}`;
    console.log(`[Order Gateway] Proxy genérico: ${req.method} ${url}`);
    
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: req.headers,
      timeout: 30000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { 
      error: "Error en order service",
      path: req.path,
      method: req.method
    };
    console.error('[Order Gateway] Error en proxy genérico:', data);
    res.status(status).json(data);
  }
});

module.exports = router;