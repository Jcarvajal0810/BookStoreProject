const express = require('express');
const axios = require('axios');
const router = express.Router();

const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:7000';

router.all('*', async (req, res) => {
  try {
    const url = `${PAYMENT_URL}/api/payments${req.path}`;
    console.log(' Payment request:', req.method, url); // Debug
    
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: req.headers
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: "Error en payment service" };
    console.error(' Payment error:', status, data);
    res.status(status).json(data);
  }
});

module.exports = router;