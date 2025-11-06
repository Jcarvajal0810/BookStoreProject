const express = require('express');
const axios = require('axios');
const router = express.Router();

const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment:7000';

// Cache simple para evitar duplicados
const processedPayments = new Set();

router.all('*', async (req, res) => {
  try {
    const url = `${PAYMENT_URL}/api/payments${req.path}`;
    
    // Si es un proceso de pago, verificar duplicados
    if (req.path.includes('/process')) {
      const paymentRef = req.path.split('/')[1]; // Extraer REF-1762371174
      
      if (processedPayments.has(paymentRef)) {
        console.log('⚠️ Pago ya procesado (cache):', paymentRef);
        return res.status(400).json({ 
          error: "already processed",
          message: "Este pago ya fue procesado anteriormente"
        });
      }
    }
    
    console.log('💳 Payment request:', req.method, url);
    
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      validateStatus: function (status) {
        // Aceptar cualquier status code para manejarlo manualmente
        return status >= 200 && status < 600;
      }
    });
    
    // ✅ Asegurar que la respuesta siempre sea JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Si el proceso fue exitoso, guardarlo en cache
    if (req.path.includes('/process') && response.status === 200) {
      const paymentRef = req.path.split('/')[1];
      processedPayments.add(paymentRef);
      console.log('✅ Pago procesado, agregado a cache:', paymentRef);
      
      // Limpiar cache después de 1 hora
      setTimeout(() => {
        processedPayments.delete(paymentRef);
        console.log('🗑️ Pago removido del cache:', paymentRef);
      }, 3600000);
    }
    
    // Devolver la respuesta con el status code original
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('💥 Payment error:', error.message);
    
    // ✅ Asegurar respuesta JSON incluso en errores
    res.setHeader('Content-Type', 'application/json');
    
    if (error.response) {
      // El backend respondió con un error
      const status = error.response.status;
      const data = error.response.data;
      
      console.error('❌ Error del payment service:', status, data);
      res.status(status).json(data);
    } else if (error.request) {
      // No hubo respuesta del backend
      console.error('❌ Payment service no responde');
      res.status(503).json({ 
        error: "service unavailable",
        message: "Payment service no está disponible"
      });
    } else {
      // Error en la configuración de la petición
      console.error('❌ Error configurando petición:', error.message);
      res.status(500).json({ 
        error: "internal error",
        message: "Error interno del gateway"
      });
    }
  }
});

module.exports = router;