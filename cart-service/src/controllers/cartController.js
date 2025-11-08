// cart-service/src/controllers/cartController.js
const Cart = require('../models/cart');
const inventoryClient = require('../../grpc/inventoryClient');

/**
 * Emitir evento stock_updated a todos los clientes conectados vía WebSocket
 */
function emitStockUpdate(book_id, new_stock) {
  try {
    if (global.io) {
      global.io.emit('stock_updated', { book_id, new_stock });
      console.log(`🔔 Emitido stock_updated → ${book_id}: ${new_stock}`);
    } else {
      console.log("⚠️ global.io no está definido, no se emitió evento WebSocket");
    }
  } catch (err) {
    console.error("Error emitiendo stock_updated:", err);
  }
}

// Obtener carrito
exports.getCart = async (req, res) => {
  try {
    const { user_id } = req.params;
    const cart = await Cart.findOne({ user_id });
    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener total
exports.getTotal = async (req, res) => {
  try {
    const { user_id } = req.params;
    const cart = await Cart.findOne({ user_id });
    if (!cart) return res.status(404).json({ message: 'Carrito vacío' });

    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.json({ user_id, total });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Agregar ítem + reservar stock
exports.addItem = async (req, res) => {
  try {
    const { user_id, book_id, title, price, quantity } = req.body;
    if (!user_id || !book_id || !quantity) {
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
    }

    console.log(`🛒 addItem → ${book_id} x${quantity}`);

    const stockResp = await inventoryClient.checkStock(book_id);
    if (!stockResp.in_stock || stockResp.available_units < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Disponibles: ${stockResp.available_units}`
      });
    }

    const reserveResp = await inventoryClient.reserveStock(book_id, quantity);
    if (!reserveResp.success) {
      return res.status(400).json({ success: false, message: reserveResp.message });
    }

    let cart = await Cart.findOne({ user_id });
    if (!cart) {
      cart = new Cart({ user_id, items: [{ book_id, title, price, quantity }] });
    } else {
      const item = cart.items.find(i => i.book_id === book_id);
      if (item) item.quantity += quantity;
      else cart.items.push({ book_id, title, price, quantity });
    }

    cart.updated_at = Date.now();
    await cart.save();

    // Emit new stock
    const newStockResp = await inventoryClient.checkStock(book_id);
    emitStockUpdate(book_id, newStockResp.available_units);

    res.status(201).json({ success: true, message: 'Producto agregado ✅', cart });

  } catch (err) {
    console.error('❌ Error en addItem:', err);
    res.status(500).json({ error: err.message });
  }
};

// Actualizar cantidad
exports.updateItem = async (req, res) => {
  try {
    const { user_id, book_id, quantity } = req.body;
    const cart = await Cart.findOne({ user_id });
    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });

    const item = cart.items.find(i => i.book_id === book_id);
    if (!item) return res.status(404).json({ message: 'Libro no está en el carrito' });

    const diff = quantity - item.quantity;

    if (diff > 0) {
      const reserve = await inventoryClient.reserveStock(book_id, diff);
      if (!reserve.success) {
        return res.status(400).json({ success: false, message: reserve.message });
      }
    } else if (diff < 0) {
      await inventoryClient.releaseStock(book_id, Math.abs(diff));
    }

    item.quantity = quantity;
    cart.updated_at = Date.now();
    await cart.save();

    const newStockResp = await inventoryClient.checkStock(book_id);
    emitStockUpdate(book_id, newStockResp.available_units);

    res.json({ success: true, message: 'Cantidad actualizada ✅', cart });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar ítem
exports.removeItem = async (req, res) => {
  try {
    const { book_id } = req.params;
    const cart = await Cart.findOne({ 'items.book_id': book_id });
    if (!cart) return res.status(404).json({ message: 'Item no encontrado' });

    const item = cart.items.find(i => i.book_id === book_id);
    if (item) await inventoryClient.releaseStock(book_id, item.quantity);

    cart.items = cart.items.filter(i => i.book_id !== book_id);
    cart.updated_at = Date.now();
    await cart.save();

    const newStockResp = await inventoryClient.checkStock(book_id);
    emitStockUpdate(book_id, newStockResp.available_units);

    res.json({ success: true, message: 'Item eliminado ✅', cart });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Vaciar carrito
exports.clearCart = async (req, res) => {
  try {
    const { user_id } = req.params;
    const cart = await Cart.findOne({ user_id });
    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });

    // liberar stock de cada item
    for (const item of cart.items) {
      await inventoryClient.releaseStock(item.book_id, item.quantity);

      const newStockResp = await inventoryClient.checkStock(item.book_id);
      emitStockUpdate(item.book_id, newStockResp.available_units);
    }

    cart.items = [];
    cart.updated_at = Date.now();
    await cart.save();

    res.json({ success: true, message: 'Carrito vaciado ✅', cart });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
