const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Endpoints existentes + nuevos
router.get('/:user_id', cartController.getCart);
router.get('/total/:user_id', cartController.getTotal);
router.post('/add', cartController.addItem);
router.put('/update', cartController.updateItem);
router.delete('/remove/:book_id', cartController.removeItem);
router.delete('/clear/:user_id', cartController.clearCart);

module.exports = router;
