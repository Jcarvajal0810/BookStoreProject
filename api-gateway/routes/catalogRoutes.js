const express = require('express');
const axios = require('axios');
const router = express.Router();

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog:3000';
const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory:8000';

// Obtener catálogo con stock sincronizado
router.get('/', async (req, res) => {
  try {
    // 1) Traer libros
    const booksResponse = await axios.get(`${CATALOG_URL}/api/books`);
    const books = booksResponse.data;

    // 2) Traer inventario
    const invResponse = await axios.get(`${INVENTORY_URL}/api/inventory`);
    const inventory = invResponse.data;

    // 3) Convertir inventario en mapa para búsqueda rápida
    const stockMap = {};
    inventory.forEach(item => {
      stockMap[item.book_id] = item.stock;
    });

    // 4) Mezclar stock con los libros
    const merged = books.map(book => ({
      ...book,
      stock: stockMap[book._id] ?? 0
    }));

    res.json(merged);

  } catch (error) {
    console.error(" Error fusionando catálogo + inventario:", error.message);
    return res.status(500).json({
      error: "Error consultando catálogo con stock sincronizado"
    });
  }
});

// Obtener un libro con su stock incluido
router.get('/:id', async (req, res) => {
  try {
    // 1) Traer libro
    const bookResponse = await axios.get(`${CATALOG_URL}/api/books/${req.params.id}`);
    const book = bookResponse.data;

    // 2) Traer stock
    const invResponse = await axios.get(`${INVENTORY_URL}/api/inventory/${req.params.id}`);
    const inventory = invResponse.data;

    res.json({
      ...book,
      stock: inventory?.stock ?? 0
    });

  } catch (error) {
    res.status(500).json({ error: "Error consultando libro con stock" });
  }
});

module.exports = router;
