const express = require('express');
const axios = require('axios');
const router = express.Router();

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8000';

router.all('*', async (req, res) => {
  try {
    const url = `${INVENTORY_URL}/api/inventory${req.path}`;
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: req.headers
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: "Error en inventory service" };
    res.status(status).json(data);
  }
});

module.exports = router;