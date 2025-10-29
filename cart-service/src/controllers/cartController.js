const Cart = require('../models/cart');

// Obtener carrito de un usuario
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

// Obtener total del carrito
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

// Agregar un ítem al carrito
exports.addItem = async (req, res) => {
  try {
    const { user_id, book_id, title, price, quantity } = req.body;
    let cart = await Cart.findOne({ user_id });

    if (!cart) {
      cart = new Cart({ user_id, items: [{ book_id, title, price, quantity }] });
    } else {
      const existingItem = cart.items.find(i => i.book_id === book_id);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ book_id, title, price, quantity });
      }
    }

    cart.updated_at = Date.now();
    await cart.save();
    res.status(201).json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar cantidad de un ítem
exports.updateItem = async (req, res) => {
  try {
    const { user_id, book_id, quantity } = req.body;
    const cart = await Cart.findOne({ user_id });
    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });

    const item = cart.items.find(i => i.book_id === book_id);
    if (!item) return res.status(404).json({ message: 'Libro no encontrado en el carrito' });

    item.quantity = quantity;
    cart.updated_at = Date.now();
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar un ítem
exports.removeItem = async (req, res) => {
  try {
    const { book_id } = req.params;
    const cart = await Cart.findOneAndUpdate(
      { "items.book_id": book_id },
      { $pull: { items: { book_id } }, $set: { updated_at: Date.now() } },
      { new: true }
    );
    if (!cart) return res.status(404).json({ message: 'Item no encontrado' });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Vaciar carrito de un usuario
exports.clearCart = async (req, res) => {
  try {
    const { user_id } = req.params;
    const cart = await Cart.findOneAndUpdate(
      { user_id },
      { $set: { items: [], updated_at: Date.now() } },
      { new: true }
    );
    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
