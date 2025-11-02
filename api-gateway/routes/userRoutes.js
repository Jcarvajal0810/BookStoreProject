const express = require('express');
const axios = require('axios');
const router = express.Router();

const USER_URL = process.env.USER_SERVICE_URL || 'http://localhost:6000';

router.all('*', async (req, res) => {
  try {
    // El frontend llama /users/auth/register
    // Enviamos a Spring Boot como /api/auth/register
    const url = `${USER_URL}/api${req.path}`;
    console.log(` User: ${req.method} ${req.originalUrl} -> ${url}`);
    
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: "Error en user service" };
    console.error(' User error:', status, url, data);
    res.status(status).json(data);
  }
});

module.exports = router;