const express = require('express');
const axios = require('axios');
const router = express.Router();

const CART_URL = process.env.CART_SERVICE_URL || 'http://cart:5000';


// Proxy manual para todas las rutas del carrito
router.all('*', async (req, res) => {
  try {
    const url = `${CART_URL}/api/cart${req.path}`;
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: req.headers
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: "Error en cart service" };
    res.status(status).json(data);
  }
});

module.exports = router;