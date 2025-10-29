const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const router = express.Router();

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8000';

router.use('/', createProxyMiddleware({
    target: INVENTORY_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/inventory': '/api/inventory', // Mantiene la ruta
    }
}));

module.exports = router;