const express = require('express');
const axios = require('axios');
const router = express.Router();

// Lee desde variable de entorno o usa localhost por defecto
const CATALOG_URL = process.env.CATALOG_SERVICE_URL || "http://localhost:3000";

// Obtener todos los libros
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${CATALOG_URL}/api/books`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error consultando catálogo" });
  }
});

// Detalle de libro por ID
router.get('/:id', async (req, res) => {
  try {
    const response = await axios.get(`${CATALOG_URL}/api/books/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error consultando libro" });
  }
});

module.exports = router;