const express = require('express');
const axios = require('axios');
const router = express.Router();

const ORDER_URL = process.env.ORDER_SERVICE_URL || 'http://order:4000';


router.all('*', async (req, res) => {
  try {
    const url = `${ORDER_URL}/api/orders${req.path}`;
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: req.headers
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: "Error en order service" };
    res.status(status).json(data);
  }
});

module.exports = router;