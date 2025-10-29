const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const router = express.Router();

router.use('/', createProxyMiddleware({
    target: 'http://order-service:4000',
    changeOrigin: true
}));

module.exports = router;
